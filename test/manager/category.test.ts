import { CategoryManager, ICategoryManager, resolveWatchCategory, findWatchCategoryById, resolveFlagCategory, findFlagCategoryById } from '../../src/manager/category';
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

      // Next getTickerCategory returns optimistic value (no backend fetch)
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'EVICT_ME', state: 'READY' }));
      const result = await categoryManager.getTickerCategory('EVICT_ME');
      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      // Backend not called again — served from cache + override
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

      // Next lookup returns optimistic value — no extra backend call
      const result = await categoryManager.getTickerCategory('TICKER_A');
      expect(result.flag?.id).toBe(FlagCategoryId.DOWNTREND);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should evict cache on backend update failure', async () => {
      mockTickerManager.updateTicker.mockRejectedValue(new Error('Backend error'));

      categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, ['TICKER_A']);

      // Cache is set optimistically
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
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should handle empty ticker array', () => {
      categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });
});

// ════════════════════════════════════════════
// Watch Category Helper Tests
// ════════════════════════════════════════════

describe('resolveWatchCategory', () => {
  function makeCatTicker(overrides: Partial<Ticker>): Ticker {
    return new Ticker({
      ticker: 'TEST',
      exchange: '',
      timeframes: ['MN', 'WK', 'DL'],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'SIDEWAYS',
      ...overrides,
    });
  }

  describe('classified by state, type, then timeframes', () => {
    it('classifies READY state ticker as READY', () => {
      const ticker = makeCatTicker({ state: 'READY' });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.READY);
    });

    it('classifies COMPOSITE ticker as COMPOSITE (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'CNXMIDCAP/USDINR/XAUUSD*100',
        type: 'COMPOSITE',
        timeframes: ['SMN', 'TMN', 'MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.COMPOSITE);
    });

    it('classifies INDEX ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'NIFTY',
        type: 'INDEX',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies COMMODITY ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'GOLD',
        type: 'COMMODITY',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies FX ticker with no DL timeframes as INDEX', () => {
      const ticker = makeCatTicker({
        ticker: 'EURUSD',
        type: 'FX',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies BOND ticker with no DL timeframes as INDEX', () => {
      const ticker = makeCatTicker({
        ticker: 'US10Y',
        type: 'BOND',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies NSE EQUITY ticker with no DL timeframes as LONG_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'RELIANCE',
        type: 'EQUITY',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NSE);
    });

    it('classifies non-NSE EQUITY ticker with no DL timeframes as LONG_NON_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'AAPL',
        type: 'EQUITY',
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('returns undefined for EQUITY ticker with DL timeframes (default daily)', () => {
      const ticker = makeCatTicker({
        ticker: 'DAILY',
        type: 'EQUITY',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
      });

      expect(resolveWatchCategory(ticker)).toBeUndefined();
    });

    it('returns undefined for untracked ticker (backend not found)', () => {
      expect(resolveWatchCategory(new Ticker({} as any))).toBeUndefined();
    });

    it('treats COMPOSITE as market for isMarket check', () => {
      const ticker = makeCatTicker({
        ticker: 'GOLD/SILVER',
        type: 'COMPOSITE',
        state: 'WATCHED',
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.COMPOSITE);
    });
  });
});

describe('findWatchCategoryById', () => {
  it('returns RUNNING for RUNNING id', () => {
    const cat = findWatchCategoryById(WatchCategoryId.RUNNING);

    expect(cat.id).toBe(WatchCategoryId.RUNNING);
    expect(cat.color).toBe('lime');
    expect(cat.label).toBe('Running Trades (Journal)');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns READY for READY id', () => {
    const cat = findWatchCategoryById(WatchCategoryId.READY);

    expect(cat.id).toBe(WatchCategoryId.READY);
    expect(cat.color).toBe('red');
    expect(cat.label).toBe('Ready');
    expect(cat.recordUpdate).toEqual({ state: 'READY' });
  });

  it('returns INDEX for INDEX id', () => {
    const cat = findWatchCategoryById(WatchCategoryId.INDEX);

    expect(cat.id).toBe(WatchCategoryId.INDEX);
    expect(cat.color).toBe('brown');
    expect(cat.label).toBe('Index');
    expect(cat.recordUpdate).toEqual({ type: 'INDEX' });
  });

  it('throws for invalid id', () => {
    expect(() => findWatchCategoryById('INVALID' as WatchCategoryId)).toThrow('Invalid watch category id: INVALID');
  });
});

// ════════════════════════════════════════════
// Flag Category Helper Tests
// ════════════════════════════════════════════

describe('resolveFlagCategory', () => {
  function makeFlagTicker(overrides: Partial<Ticker> = {}): Ticker {
    return new Ticker({
      ticker: 'TEST',
      exchange: '',
      timeframes: [],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'SIDEWAYS',
      ...overrides,
    });
  }

  it('resolves GOLD_INDEX for XAUUSD index ticker', () => {
    const ticker = makeFlagTicker({
      ticker: 'XAUUSD',
      type: 'INDEX',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.GOLD_INDEX);
  });

  it('resolves GOLD_INDEX for GOLDSILVER composite ticker', () => {
    const ticker = makeFlagTicker({
      ticker: 'GOLDSILVER',
      type: 'COMPOSITE',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.GOLD_INDEX);
  });

  it('resolves INDEX for non-gold market instrument', () => {
    const ticker = makeFlagTicker({
      ticker: 'NIFTY',
      type: 'INDEX',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('resolves INDEX for COMMODITY type', () => {
    const ticker = makeFlagTicker({
      ticker: 'CRUDEOIL',
      type: 'COMMODITY',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('resolves CRYPTO for CRYPTO type', () => {
    const ticker = makeFlagTicker({
      ticker: 'BTC',
      type: 'CRYPTO',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.CRYPTO);
  });

  it('resolves UPTREND for UPTREND trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'BULL',
      trend: 'UPTREND',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.UPTREND);
  });

  it('resolves SIDEWAYS for SIDEWAYS trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'RANGE',
      trend: 'SIDEWAYS',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.SIDEWAYS);
  });

  it('resolves DOWNTREND for DOWNTREND trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'BEAR',
      trend: 'DOWNTREND',
    });

    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.DOWNTREND);
  });

  it('returns undefined for non-market EQUITY that is not GOLD_INDEX/INDEX/CRYPTO and has no trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'UNKNOWN',
      type: 'EQUITY',
      trend: undefined,
    });

    expect(resolveFlagCategory(ticker)).toBeUndefined();
  });

  it('enforces category priority: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND', () => {
    // CRYPTO ticker with UPTREND trend — GOLD_INDEX does not match (EQUITY), INDEX does not match
    const ticker = makeFlagTicker({
      ticker: 'BTC',
      type: 'CRYPTO',
      trend: 'UPTREND',
    });

    // Highest priority that matches is CRYPTO (not UPTREND)
    expect(resolveFlagCategory(ticker)?.id).toBe(FlagCategoryId.CRYPTO);
  });
});

describe('findFlagCategoryById', () => {
  it('returns valid category for SIDEWAYS', () => {
    const cat = findFlagCategoryById(FlagCategoryId.SIDEWAYS);

    expect(cat.id).toBe(FlagCategoryId.SIDEWAYS);
    expect(cat.color).toBe('orange');
  });

  it('throws for invalid id', () => {
    expect(() => findFlagCategoryById('INVALID' as FlagCategoryId)).toThrow('Invalid flag category id: INVALID');
  });
});
