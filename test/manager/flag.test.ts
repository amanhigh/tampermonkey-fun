import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerManager } from '../../src/manager/ticker';
import { IPaintManager } from '../../src/manager/paint';
import { IDomManager } from '../../src/manager/dom';
import { TickerArea, TickerVisibility } from '../../src/models/dom';
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
      getTickers: jest.fn().mockReturnValue(new Set()),
      isScreenerVisible: jest.fn().mockReturnValue(false),
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
      // Default: DomManager returns watchlist tickers; screener not visible
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['SIDE_A', 'BTC']);
        return new Set();
      });
      mockDomManager.isScreenerVisible.mockReturnValue(false);
    });

    it('should not call listTickers during paint', () => {
      flagManager.paint();

      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
    });

    it('should paint watchlist always and screener only when visible', async () => {
      // Screener is visible with its own tickers
      mockDomManager.isScreenerVisible.mockReturnValue(true);
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['SIDE_A', 'BTC']);
        if (area === TickerArea.SCREENER) return new Set(['SCREEN_X', 'SCREEN_Y']);
        return new Set();
      });

      mockTickerManager.getTicker.mockImplementation((ticker: string) => {
        if (ticker === 'SIDE_A') return Promise.resolve(makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }));
        if (ticker === 'BTC') return Promise.resolve(makeTicker({ ticker: 'BTC', type: 'CRYPTO' }));
        if (ticker === 'SCREEN_X') return Promise.resolve(makeTicker({ ticker: 'SCREEN_X', trend: 'UPTREND' }));
        if (ticker === 'SCREEN_Y') return Promise.resolve(makeTicker({ ticker: 'SCREEN_Y', trend: 'DOWNTREND' }));
        return Promise.reject(new Error('Not found'));
      });

      flagManager.paint();
      await waitForAsync();

      // Gets watchlist AND screener tickers
      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.SCREENER, TickerVisibility.ALL);

      // Watched for visibility
      expect(mockDomManager.isScreenerVisible).toHaveBeenCalled();

      // Each watchlist ticker painted with source = WATCHLIST
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'SIDE_A', 'orange');
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'BTC', 'dodgerblue');

      // Each screener ticker painted with source = SCREENER
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.SCREENER, 'SCREEN_X', 'lime');
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.SCREENER, 'SCREEN_Y', 'red');

      // Exactly 4 V1 calls (2 watchlist + 2 screener)
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(4);
    });

    it('should not query screener tickers when screener is not visible', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(false);

      flagManager.paint();
      await waitForAsync();

      // Only watchlist queried
      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(mockDomManager.getTickers).not.toHaveBeenCalledWith(TickerArea.SCREENER, TickerVisibility.ALL);

      // No screener V1 calls
      const calls = mockPaintManager.paintFlagV1.mock.calls;
      const screenerCalls = calls.filter(([type]) => type === TickerArea.SCREENER);
      expect(screenerCalls).toHaveLength(0);
    });

    it('should skip classification and V1 paint when both panels have no tickers', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      flagManager.paint();
      await waitForAsync();

      // No classification calls
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();

      // No V1 paint calls
      expect(mockPaintManager.paintFlagV1).not.toHaveBeenCalled();
    });

    it('should handle all tickers uncategorized gracefully', async () => {
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['UNCAT_A', 'UNCAT_B']);
        return new Set();
      });
      // Both are untracked — getTickerCategory returns undefined
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      flagManager.paint();
      await waitForAsync();

      // Each ticker was looked up
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('UNCAT_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('UNCAT_B');

      // V1 called for each ticker with undefined color (reset only)
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'UNCAT_A', undefined);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'UNCAT_B', undefined);

      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(2);
    });

    it('should apply display priority for DOM ticker', async () => {
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['ETH']);
        return new Set();
      });
      // Ticker with both CRYPTO type and UPTREND trend → resolveFlagCategory returns CRYPTO
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' })
      );

      flagManager.paint();
      await waitForAsync();

      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'ETH', 'dodgerblue');
    });

    it('should paint categorized DOM ticker with its color via V1', async () => {
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['SIDE_A']);
        return new Set();
      });
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' })
      );

      flagManager.paint();
      await waitForAsync();

      // V1 called once with WATCHLIST source and SIDEWAYS color
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'SIDE_A', 'orange');
    });

    it('should dedupe duplicate watchlist tickers before classification', async () => {
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['DUP']);
        return new Set();
      });
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'DUP', trend: 'SIDEWAYS' })
      );

      flagManager.paint();
      await waitForAsync();

      // getTicker fetched only once despite duplicate entries
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // V1 painted only once
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'DUP', 'orange');
    });

    it('should paint same ticker once for watchlist and once for screener when present in both panels', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);
      mockDomManager.getTickers.mockImplementation((area: TickerArea, _visibility: TickerVisibility) => {
        if (area === TickerArea.WATCHLIST) return new Set(['COMMON']);
        if (area === TickerArea.SCREENER) return new Set(['COMMON']);
        return new Set();
      });
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'COMMON', trend: 'SIDEWAYS' })
      );

      flagManager.paint();
      await waitForAsync();

      // Painted once per source (2 calls total)
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledTimes(2);
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.WATCHLIST, 'COMMON', 'orange');
      expect(mockPaintManager.paintFlagV1).toHaveBeenCalledWith(TickerArea.SCREENER, 'COMMON', 'orange');
    });
  });
});
