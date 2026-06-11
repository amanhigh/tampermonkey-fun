import { CategoryManager, ICategoryManager } from '../../src/manager/category';
import { ITickerManager } from '../../src/manager/ticker';
import { IJournalManager } from '../../src/manager/journal';
import { Ticker } from '../../src/models/ticker';
import { WatchCategoryId } from '../../src/models/watch';
import { FlagCategoryId } from '../../src/models/flag';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

describe('CategoryManager', () => {
  let categoryManager: ICategoryManager;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockJournalManager: jest.Mocked<IJournalManager>;

  // ── Helpers ──

  async function waitForAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
    const defaults: Partial<Ticker> = {
      ticker: 'TICKER',
      exchange: '',
      timeframes: ['MN', 'WK', 'DL'],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'SIDEWAYS',
    };
    return new Ticker({ ...defaults, ...overrides });
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerManager = {
      listTickers: jest.fn().mockResolvedValue([]),
      updateTicker: jest.fn().mockResolvedValue(undefined as any),
      getTicker: jest.fn().mockRejectedValue(new Error('not found')),
      startTracking: jest.fn(),
      markRecent: jest.fn(),
      stopTracking: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    mockJournalManager = {
      listJournals: jest.fn().mockResolvedValue([]),
      createJournal: jest.fn(),
      screenshotTicker: jest.fn(),
      findRunningJournal: jest.fn(),
      addJournalImages: jest.fn(),
      addReasonTags: jest.fn(),
      updateJournalStatus: jest.fn(),
      createReasonText: jest.fn(),
      publishJournalOpenEvent: jest.fn(),
    } as unknown as jest.Mocked<IJournalManager>;

    // Lazy getter to break factory cycle
    categoryManager = new CategoryManager(mockTickerManager, () => mockJournalManager);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(categoryManager).toBeDefined();
      expect(categoryManager).toBeInstanceOf(CategoryManager);
    });

    it('should NOT call backend on construction', () => {
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
    });

    it('should return undefined categories for untracked ticker', async () => {
      const result = await categoryManager.getTickerCategory('ANY');
      expect(result.watch).toBeUndefined();
      expect(result.flag).toBeUndefined();
    });
  });

  // ── getTickerCategory (watch + flag combined) ──

  describe('getTickerCategory', () => {
    it('should return undefined for both categories when ticker has no match', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      const result = await categoryManager.getTickerCategory('UNKNOWN');

      expect(result.watch).toBeUndefined();
      expect(result.flag).toBeUndefined();
    });

    it('should return undefined watch when only SET journal exists', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'SET') return [{ ticker: 'SET_1' }] as any;
        return [];
      });

      const result = await categoryManager.getTickerCategory('SET_1');

      expect(result.watch).toBeUndefined();
    });

    it('should return RUNNING watch when RUNNING journal exists', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'RUNNING') return [{ ticker: 'RUN_1' }] as any;
        return [];
      });

      const result = await categoryManager.getTickerCategory('RUN_1');

      expect(result.watch?.id).toBe(WatchCategoryId.RUNNING);
      expect(result.watch?.color).toBe('lime');
    });

    it('should return RUNNING when both SET and RUNNING exist', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'RUNNING') return [{ ticker: 'DUAL' }] as any;
        return [];
      });

      const result = await categoryManager.getTickerCategory('DUAL');

      expect(result.watch?.id).toBe(WatchCategoryId.RUNNING);
    });

    it('should return READY watch when ticker state is READY', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'READY_A', state: 'READY' }));

      const result = await categoryManager.getTickerCategory('READY_A');

      expect(result.watch?.id).toBe(WatchCategoryId.READY);
    });

    it('should return LONG_NSE watch for long-watch NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_NSE', exchange: 'NSE', timeframes: ['MN', 'WK'] }));

      const result = await categoryManager.getTickerCategory('LONG_NSE');

      expect(result.watch?.id).toBe(WatchCategoryId.LONG_NSE);
    });

    it('should return LONG_NON_NSE watch for long-watch non-NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_US', exchange: 'NASDAQ', timeframes: ['MN', 'WK'] }));

      const result = await categoryManager.getTickerCategory('LONG_US');

      expect(result.watch?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('should return INDEX watch for market instrument types', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'IND_A', type: 'INDEX' }));

      const result = await categoryManager.getTickerCategory('IND_A');

      expect(result.watch?.id).toBe(WatchCategoryId.INDEX);
    });

    it('should return COMPOSITE watch for composite ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'COMP_A', type: 'COMPOSITE' }));

      const result = await categoryManager.getTickerCategory('COMP_A');

      expect(result.watch?.id).toBe(WatchCategoryId.COMPOSITE);
    });

    it('should NOT return DEFAULT_DAILY watch (UI-only fallback)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await categoryManager.getTickerCategory('WATCH_TICKER');

      expect(result.watch).toBeUndefined();
    });

    it('should skip journal lookup for composite ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await categoryManager.getTickerCategory('BANKNIFTY/NIFTY');

      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
    });

    it('should query journals with ticker filter (RUNNING only)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await categoryManager.getTickerCategory('SOME_TICKER');

      expect(mockJournalManager.listJournals).toHaveBeenCalledTimes(1);
      expect(mockJournalManager.listJournals).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'SOME_TICKER', status: 'RUNNING' })
      );
    });

    it('should query ticker from backend ticker manager', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await categoryManager.getTickerCategory('SOME_TICKER');

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('SOME_TICKER');
    });

    it('should reuse cached category for repeated categorized ticker lookup', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'CACHED', state: 'READY' }));

      // First call — populates cache
      const first = await categoryManager.getTickerCategory('CACHED');
      expect(first.watch?.id).toBe(WatchCategoryId.READY);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Second call — cache hit, no backend call
      jest.clearAllMocks();
      const second = await categoryManager.getTickerCategory('CACHED');
      expect(second.watch?.id).toBe(WatchCategoryId.READY);
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
    });

    it('should NOT cache uncategorized ticker result (misses hit backend each time)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      // First call — miss, no category cached
      const first = await categoryManager.getTickerCategory('MISS');
      expect(first.watch).toBeUndefined();
      expect(first.flag).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Second call — still a miss, hits backend again
      jest.clearAllMocks();
      const second = await categoryManager.getTickerCategory('MISS');
      expect(second.watch).toBeUndefined();
      expect(second.flag).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
      expect(mockJournalManager.listJournals).toHaveBeenCalledTimes(1);
    });

    // ── Flag-specific category resolution ──

    it('should return SIDEWAYS flag for SIDEWAYS trend ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' })
      );

      const result = await categoryManager.getTickerCategory('SIDE_A');
      expect(result.flag?.id).toBe(FlagCategoryId.SIDEWAYS);
    });

    it('should return CRYPTO flag for CRYPTO type ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' })
      );

      const result = await categoryManager.getTickerCategory('BTC');
      expect(result.flag?.id).toBe(FlagCategoryId.CRYPTO);
    });

    it('should return both watch and flag categories from a single lookup', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'BOTH', state: 'READY', trend: 'UPTREND' })
      );

      const result = await categoryManager.getTickerCategory('BOTH');

      // Watch derived from state=READY
      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      // Flag derived from trend=UPTREND
      expect(result.flag?.id).toBe(FlagCategoryId.UPTREND);
      // Single backend ticker fetch
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should return flag even when watch is undefined', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'FLAG_ONLY', trend: 'UPTREND', type: 'EQUITY', state: 'WATCHED', timeframes: ['MN', 'WK', 'DL'] })
      );

      const result = await categoryManager.getTickerCategory('FLAG_ONLY');

      expect(result.watch).toBeUndefined();
      expect(result.flag?.id).toBe(FlagCategoryId.UPTREND);
    });

    it('should return watch even when flag is undefined', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'WATCH_ONLY', state: 'READY', trend: undefined, type: 'EQUITY' })
      );

      const result = await categoryManager.getTickerCategory('WATCH_ONLY');

      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      expect(result.flag).toBeUndefined();
    });
  });

  // ── recordWatchCategory ──

  describe('recordWatchCategory', () => {
    it('should update ticker for READY category', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.READY, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { state: 'READY' });
    });

    it('should update ticker for INDEX category', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should NOT update backend for COMPOSITE (unsupported)', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.COMPOSITE, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for SET_JOURNAL (journal-derived)', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.SET_JOURNAL, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for RUNNING (journal-derived)', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.RUNNING, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle empty ticker array', () => {
      categoryManager.recordWatchCategory(WatchCategoryId.READY, []);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should optimistically cache recorded watch category for instant repaint', async () => {
      // Populate cache with uncategorized result
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));
      await categoryManager.getTickerCategory('EVICT_ME');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Optimistic cache + update via recordWatchCategory
      jest.clearAllMocks();
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);
      categoryManager.recordWatchCategory(WatchCategoryId.READY, ['EVICT_ME']);

      // Verify update was called
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('EVICT_ME', { state: 'READY' });

      // Next getTickerCategory returns cached value (no backend fetch)
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'EVICT_ME', state: 'READY' }));
      const result = await categoryManager.getTickerCategory('EVICT_ME');
      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      // Backend not called again — served from cache
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(0);
    });
  });

  // ── recordFlagCategory ──

  describe('recordFlagCategory', () => {
    it('should call updateTicker for SIDEWAYS', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'SIDEWAYS', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for DOWNTREND', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.DOWNTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'DOWNTREND', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for CRYPTO', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.CRYPTO, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'CRYPTO', state: 'WATCHED' });
    });

    it('should call updateTicker for UPTREND', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.UPTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'UPTREND', type: 'EQUITY', state: 'WATCHED' });
    });

    it('should call updateTicker for INDEX', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX', state: 'WATCHED' });
    });

    it('should call updateTicker for GOLD_INDEX', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.GOLD_INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE', state: 'WATCHED' });
    });

    it('should optimistically cache recorded flag category', async () => {
      // Prime: cache knows SIDEWAYS
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: 'SIDEWAYS' })
      );
      await categoryManager.getTickerCategory('TICKER_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Record: set cache to DOWNTREND without immediate backend call
      categoryManager.recordFlagCategory(FlagCategoryId.DOWNTREND, ['TICKER_A']);

      // Next lookup returns cached value — no extra backend call
      const result = await categoryManager.getTickerCategory('TICKER_A');
      expect(result.flag?.id).toBe(FlagCategoryId.DOWNTREND);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should evict cache on backend update failure', async () => {
      mockTickerManager.updateTicker.mockRejectedValue(new Error('Backend error'));

      categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, ['TICKER_A']);

      // Cache was set optimistically
      let result = await categoryManager.getTickerCategory('TICKER_A');
      expect(result.flag?.id).toBe(FlagCategoryId.SIDEWAYS);

      // Let async syncBackend fail and evict
      await waitForAsync();

      // Next lookup hits backend (cache was evicted on failure)
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: 'SIDEWAYS' })
      );
      result = await categoryManager.getTickerCategory('TICKER_A');
      expect(result.flag?.id).toBe(FlagCategoryId.SIDEWAYS);
      // Single fetch call because cache was cold after eviction
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should handle empty ticker array', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });
});
