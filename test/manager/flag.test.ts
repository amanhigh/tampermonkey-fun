import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerManager } from '../../src/manager/ticker';
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

    flagManager = new FlagManager(mockTickerManager);
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
});
