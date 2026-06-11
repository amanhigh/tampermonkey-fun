import { WatchManager, IWatchManager, resolveWatchCategory, findWatchCategoryById } from '../../src/manager/watch';
import { ITickerManager } from '../../src/manager/ticker';
import { IJournalManager } from '../../src/manager/journal';
import { Ticker } from '../../src/models/ticker';
import { WatchCategoryId } from '../../src/models/watch';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

describe('WatchManager', () => {
  let watchManager: IWatchManager;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockJournalManager: jest.Mocked<IJournalManager>;

  // ── Helpers ──

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
    watchManager = new WatchManager(mockTickerManager, () => mockJournalManager);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(watchManager).toBeDefined();
      expect(watchManager).toBeInstanceOf(WatchManager);
    });

    it('should NOT call backend on construction', () => {
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
    });
  });

  // ── getTickerCategory ──

  describe('getTickerCategory', () => {
    it('should return undefined for ticker with no match', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      const result = await watchManager.getTickerCategory('UNKNOWN');

      expect(result).toBeUndefined();
    });

    it('should return undefined when only SET journal exists (no longer auto-classified)', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'SET') return [{ ticker: 'SET_1' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('SET_1');

      expect(result).toBeUndefined();
    });

    it('should return RUNNING when RUNNING journal exists', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'RUNNING') return [{ ticker: 'RUN_1' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('RUN_1');

      expect(result?.id).toBe(WatchCategoryId.RUNNING);
      expect(result?.color).toBe('lime');
    });

    it('should return RUNNING when both SET and RUNNING exist', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'RUNNING') return [{ ticker: 'DUAL' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('DUAL');

      expect(result?.id).toBe(WatchCategoryId.RUNNING);
    });

    it('should return READY when ticker state is READY', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'READY_A', state: 'READY' }));

      const result = await watchManager.getTickerCategory('READY_A');

      expect(result?.id).toBe(WatchCategoryId.READY);
    });

    it('should return LONG_NSE for long-watch NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_NSE', exchange: 'NSE', timeframes: ['MN', 'WK'] }));

      const result = await watchManager.getTickerCategory('LONG_NSE');

      expect(result?.id).toBe(WatchCategoryId.LONG_NSE);
    });

    it('should return LONG_NON_NSE for long-watch non-NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_US', exchange: 'NASDAQ', timeframes: ['MN', 'WK'] }));

      const result = await watchManager.getTickerCategory('LONG_US');

      expect(result?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('should return INDEX for market instrument types', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'IND_A', type: 'INDEX' }));

      const result = await watchManager.getTickerCategory('IND_A');

      expect(result?.id).toBe(WatchCategoryId.INDEX);
    });

    it('should return COMPOSITE for composite ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'COMP_A', type: 'COMPOSITE' }));

      const result = await watchManager.getTickerCategory('COMP_A');

      expect(result?.id).toBe(WatchCategoryId.COMPOSITE);
    });

    it('should NOT return DEFAULT_DAILY (UI-only fallback)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      const result = await watchManager.getTickerCategory('WATCH_TICKER');

      // WatchManager no longer resolves DEFAULT_DAILY
      expect(result).toBeUndefined();
    });

    it('should skip journal lookup for composite ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      const result = await watchManager.getTickerCategory('BANKNIFTY/NIFTY');

      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should query journals with ticker filter (RUNNING only)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await watchManager.getTickerCategory('SOME_TICKER');

      expect(mockJournalManager.listJournals).toHaveBeenCalledTimes(1);
      expect(mockJournalManager.listJournals).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'SOME_TICKER', status: 'RUNNING' })
      );
    });

    it('should query ticker from backend ticker manager', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await watchManager.getTickerCategory('SOME_TICKER');

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('SOME_TICKER');
    });

    it('should reuse cached category for repeated categorized ticker lookup', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'CACHED', state: 'READY' }));

      // First call — populates cache
      const first = await watchManager.getTickerCategory('CACHED');
      expect(first?.id).toBe(WatchCategoryId.READY);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Second call — cache hit, no backend call
      jest.clearAllMocks();
      const second = await watchManager.getTickerCategory('CACHED');
      expect(second?.id).toBe(WatchCategoryId.READY);
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.listJournals).not.toHaveBeenCalled();
    });

    it('should NOT cache uncategorized ticker result (misses hit backend each time)', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      // First call — miss, no category cached
      const first = await watchManager.getTickerCategory('MISS');
      expect(first).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Second call — still a miss, hits backend again
      jest.clearAllMocks();
      const second = await watchManager.getTickerCategory('MISS');
      expect(second).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
      expect(mockJournalManager.listJournals).toHaveBeenCalledTimes(1);
    });
  });

  // ── recordCategory ──

  describe('recordCategory', () => {
    it('should update ticker for READY category', () => {
      watchManager.recordCategory(WatchCategoryId.READY, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { state: 'READY' });
    });

    it('should update ticker for INDEX category', () => {
      watchManager.recordCategory(WatchCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should NOT update backend for COMPOSITE (unsupported)', () => {
      watchManager.recordCategory(WatchCategoryId.COMPOSITE, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for SET_JOURNAL (journal-derived)', () => {
      watchManager.recordCategory(WatchCategoryId.SET_JOURNAL, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for RUNNING (journal-derived)', () => {
      watchManager.recordCategory(WatchCategoryId.RUNNING, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle empty ticker array', () => {
      watchManager.recordCategory(WatchCategoryId.READY, []);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should optimistically cache recorded category for instant repaint', async () => {
      // Populate cache with uncategorized result
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));
      await watchManager.getTickerCategory('EVICT_ME');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Optimistic cache + update via recordCategory
      jest.clearAllMocks();
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);
      watchManager.recordCategory(WatchCategoryId.READY, ['EVICT_ME']);

      // Verify update was called
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('EVICT_ME', { state: 'READY' });

      // Next getTickerCategory returns cached value (no backend fetch)
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'EVICT_ME', state: 'READY' }));
      const result = await watchManager.getTickerCategory('EVICT_ME');
      expect(result?.id).toBe(WatchCategoryId.READY);
      // FetchMethod not called because cache was set optimistically
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(0);
    });
  });
});

// ════════════════════════════════════════════
// Category Helper Tests
// ════════════════════════════════════════════

describe('resolveWatchCategory', () => {
  /**
   * Shared ticker builder. Defaults to an EQUITY, WATCHED ticker
   * with DL timeframes (daily) so it falls through to undefined.
   * Override specific fields per test.
   */
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
        timeframes: ['WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies EQUITY NSE ticker with no DL timeframe as LONG_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NSE);
    });

    it('classifies EQUITY non-NSE ticker with no DL timeframe as LONG_NON_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('returns undefined for daily-watch ticker (has DL, no special state/type)', () => {
      const ticker = makeCatTicker({
        ticker: 'DL_TICKER',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBeUndefined();
    });
  });
});

describe('findWatchCategoryById', () => {
  it('returns the matching WatchCategory for a valid ID', () => {
    const cat = findWatchCategoryById(WatchCategoryId.LONG_NSE);

    expect(cat.id).toBe(WatchCategoryId.LONG_NSE);
    expect(cat.color).toBe('dodgerblue');
    expect(cat.label).toBe('Long Watch (India)');
  });

  it('throws an error for an invalid WatchCategoryId', () => {
    expect(() => findWatchCategoryById('BOGUS_ID' as WatchCategoryId)).toThrow(
      'Invalid watch category id: BOGUS_ID'
    );
  });
});
