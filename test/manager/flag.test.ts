import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerManager } from '../../src/manager/ticker';
import { IPaintManager } from '../../src/manager/paint';
import { IDomManager } from '../../src/manager/dom';
import { Ticker } from '../../src/models/ticker';
import { FlagCategoryId } from '../../src/models/flag';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
  },
}));

describe('FlagManager', () => {
  let flagManager: IFlagManager;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  // ── Helpers ──

  async function waitForAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
    const defaults: Partial<Ticker> = {
      ticker: 'TICKER',
      trend: 'SIDEWAYS',
      type: 'EQUITY',
    };
    return new Ticker({ ...defaults, ...overrides });
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerManager = {
      listTickers: jest.fn().mockResolvedValue([]),
      updateTicker: jest.fn().mockResolvedValue({} as any),
      getTicker: jest.fn().mockRejectedValue(new Error('Not found')),
      startTracking: jest.fn(),
      markRecent: jest.fn(),
      stopTracking: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    mockPaintManager = {
      paintFlags: jest.fn(),
      paintFlagV1: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockDomManager = {
      getRenderedTickers: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<IDomManager>;

    flagManager = new FlagManager(mockTickerManager, mockPaintManager, mockDomManager);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(flagManager).toBeDefined();
      expect(flagManager).toBeInstanceOf(FlagManager);
    });

    it('should NOT call listTickers on construction', () => {
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
    });

    it('should return undefined for getTickerCategory for untracked ticker', async () => {
      const result = await flagManager.getTickerCategory('ANY');
      expect(result).toBeUndefined();
    });
  });

  // ── getTickerCategory (async, LRU-cached) ──

  describe('getTickerCategory', () => {
    it('should return undefined for untracked ticker', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await flagManager.getTickerCategory('UNTRACKED');
      expect(result).toBeUndefined();
    });

    it('should return FlagCategory for a SIDEWAYS ticker', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' })
      );

      const result = await flagManager.getTickerCategory('SIDE_A');
      expect(result?.id).toBe(FlagCategoryId.SIDEWAYS);
    });

    it('should return FlagCategory for a CRYPTO ticker', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' })
      );

      const result = await flagManager.getTickerCategory('BTC');
      expect(result?.id).toBe(FlagCategoryId.CRYPTO);
    });

    it('should cache resolved categories (single backend call per ticker)', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' })
      );

      await flagManager.getTickerCategory('SIDE_A');
      await flagManager.getTickerCategory('SIDE_A');
      await flagManager.getTickerCategory('SIDE_A');

      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should NOT cache backend failures (repeated calls hit backend)', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Backend down'));

      await flagManager.getTickerCategory('PLAIN');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      await flagManager.getTickerCategory('PLAIN');
      // Misses are not cached — second call hits backend again
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(2);
    });
  });

  // ── recordCategory ──

  describe('recordCategory', () => {
    it('should call updateTicker for SIDEWAYS', () => {
      flagManager.recordCategory(FlagCategoryId.SIDEWAYS, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'SIDEWAYS', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for DOWNTREND', () => {
      flagManager.recordCategory(FlagCategoryId.DOWNTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'DOWNTREND', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for CRYPTO', () => {
      flagManager.recordCategory(FlagCategoryId.CRYPTO, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'CRYPTO', state: 'WATCHED' });
    });

    it('should call updateTicker for UPTREND', () => {
      flagManager.recordCategory(FlagCategoryId.UPTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'UPTREND', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for INDEX', () => {
      flagManager.recordCategory(FlagCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX', state: 'WATCHED' });
    });

    it('should call updateTicker for GOLD_INDEX', () => {
      flagManager.recordCategory(FlagCategoryId.GOLD_INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE', state: 'WATCHED' });
    });

    it('should optimistically cache category after recordCategory', async () => {
      // Prime: cache knows SIDEWAYS
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: 'SIDEWAYS' })
      );
      await flagManager.getTickerCategory('TICKER_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Record: set cache to DOWNTREND without backend call
      flagManager.recordCategory(FlagCategoryId.DOWNTREND, ['TICKER_A']);

      // Next lookup returns from cache — no extra backend call
      const result = await flagManager.getTickerCategory('TICKER_A');
      expect(result?.id).toBe(FlagCategoryId.DOWNTREND);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should evict cache on backend update failure', async () => {
      mockTickerManager.updateTicker.mockRejectedValue(new Error('Backend error'));

      flagManager.recordCategory(FlagCategoryId.SIDEWAYS, ['TICKER_A']);

      // Cache is set optimistically
      let result = await flagManager.getTickerCategory('TICKER_A');
      expect(result?.id).toBe(FlagCategoryId.SIDEWAYS);

      // Let async updateBackend fail and evict
      await waitForAsync();

      // Next lookup hits backend (cache was evicted on failure)
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: 'SIDEWAYS' })
      );
      result = await flagManager.getTickerCategory('TICKER_A');
      expect(result?.id).toBe(FlagCategoryId.SIDEWAYS);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should handle empty ticker array', () => {
      flagManager.recordCategory(FlagCategoryId.SIDEWAYS, []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── paint ──

  describe('paint', () => {
    beforeEach(() => {
      // Default: DomManager returns two rendered tickers
      mockDomManager.getRenderedTickers.mockReturnValue(['SIDE_A', 'BTC']);
    });

    it('should not call listTickers during paint', () => {
      flagManager.paint();

      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
    });

    it('should read DOM tickers from DomManager and paint via V1', async () => {
      mockTickerManager.getTicker.mockImplementation((ticker: string) => {
        if (ticker === 'SIDE_A') return Promise.resolve(makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }));
        if (ticker === 'BTC') return Promise.resolve(makeTicker({ ticker: 'BTC', type: 'CRYPTO' }));
        return Promise.reject(new Error('Not found'));
      });

      flagManager.paint();
      await waitForAsync();

      // Reads rendered tickers from DOM
      expect(mockDomManager.getRenderedTickers).toHaveBeenCalledTimes(1);

      // No full ticker list fetch
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();

      // Each ticker classified via cache
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('SIDE_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('BTC');

      // Each ticker painted via V1 with its category color
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('SIDE_A', 'orange');
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('BTC', 'dodgerblue');

      // Exactly 2 V1 calls (no separate reset — reset is internal to V1)
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(2);
    });

    it('should skip classification and V1 paint when DomManager returns no tickers', async () => {
      mockDomManager.getRenderedTickers.mockReturnValue([]);

      flagManager.paint();
      await waitForAsync();

      // No classification calls
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();

      // No V1 paint calls
      expect(mockPaintManager.paintFlagV1).not.toHaveBeenCalled();
    });

    it('should handle all tickers uncategorized gracefully', async () => {
      mockDomManager.getRenderedTickers.mockReturnValue(['UNCAT_A', 'UNCAT_B']);
      // Both are untracked — getTickerCategory returns undefined
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      flagManager.paint();
      await waitForAsync();

      // Each ticker was looked up
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('UNCAT_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('UNCAT_B');

      // V1 called for each ticker with undefined color (reset only)
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('UNCAT_A', undefined);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('UNCAT_B', undefined);

      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(2);
    });

    it('should apply display priority for DOM ticker', async () => {
      mockDomManager.getRenderedTickers.mockReturnValue(['ETH']);
      // Ticker with both CRYPTO type and UPTREND trend → resolveFlagCategory returns CRYPTO
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' })
      );

      flagManager.paint();
      await waitForAsync();

      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('ETH', 'dodgerblue');
    });

    it('should paint categorized DOM ticker with its color via V1', async () => {
      mockDomManager.getRenderedTickers.mockReturnValue(['SIDE_A']);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' })
      );

      flagManager.paint();
      await waitForAsync();

      // V1 called once with SIDEWAYS color
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('SIDE_A', 'orange');
    });

    it('should dedupe duplicate DOM tickers across panels before classification', async () => {
      mockDomManager.getRenderedTickers.mockReturnValue(['DUP', 'DUP', 'DUP', 'DUP']);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'DUP', trend: 'SIDEWAYS' })
      );

      flagManager.paint();
      await waitForAsync();

      // getTicker fetched only once despite 4 duplicate entries
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // V1 painted only once
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith('DUP', 'orange');
    });
  });
});
