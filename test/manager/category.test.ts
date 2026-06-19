import { CategoryManager, ICategoryManager } from '../../src/manager/category';
import { ITickerManager } from '../../src/manager/ticker';
import { IJournalManager } from '../../src/manager/journal';
import { Ticker, TickerType, TickerState, TickerTrend } from '../../src/models/ticker';
import { TickerTimeframe } from '../../src/models/timeframe';
import { WatchCategoryId } from '../../src/models/watch';
import { FlagCategoryId } from '../../src/models/flag';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

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
  let mockPublisher: jest.Mocked<IPublisher>;

  // ── Helpers ──

  function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
    const defaults: Partial<Ticker> = {
      ticker: 'TICKER',
      exchange: '',
      timeframes: [TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL],
      type: TickerType.EQUITY,
      state: TickerState.WATCHED,
      trend: TickerTrend.SIDEWAYS,
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

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    // Lazy getter to break factory cycle
    categoryManager = new CategoryManager(mockTickerManager, () => mockJournalManager, mockPublisher);
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
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'READY_A', state: TickerState.READY }));

      const result = await categoryManager.getTickerCategory('READY_A');

      expect(result.watch?.id).toBe(WatchCategoryId.READY);
    });

    it('should return LONG_NSE watch for long-watch NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_NSE', exchange: 'NSE', timeframes: [TickerTimeframe.MN, TickerTimeframe.WK] }));

      const result = await categoryManager.getTickerCategory('LONG_NSE');

      expect(result.watch?.id).toBe(WatchCategoryId.LONG_NSE);
    });

    it('should return LONG_NON_NSE watch for long-watch non-NSE ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'LONG_US', exchange: 'NASDAQ', timeframes: [TickerTimeframe.MN, TickerTimeframe.WK] }));

      const result = await categoryManager.getTickerCategory('LONG_US');

      expect(result.watch?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('should return INDEX watch for market instrument types', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'IND_A', type: TickerType.INDEX }));

      const result = await categoryManager.getTickerCategory('IND_A');

      expect(result.watch?.id).toBe(WatchCategoryId.INDEX);
    });

    it('should return COMPOSITE watch for composite ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'COMP_A', type: TickerType.COMPOSITE }));

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
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'CACHED', state: TickerState.READY }));

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
        makeTicker({ ticker: 'SIDE_A', trend: TickerTrend.SIDEWAYS })
      );

      const result = await categoryManager.getTickerCategory('SIDE_A');
      expect(result.flag?.id).toBe(FlagCategoryId.SIDEWAYS);
    });

    it('should return CRYPTO flag for CRYPTO type ticker', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'BTC', type: TickerType.CRYPTO })
      );

      const result = await categoryManager.getTickerCategory('BTC');
      expect(result.flag?.id).toBe(FlagCategoryId.CRYPTO);
    });

    it('should return both watch and flag categories from a single lookup', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'BOTH', state: TickerState.READY, trend: TickerTrend.UPTREND })
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
        makeTicker({ ticker: 'FLAG_ONLY', trend: TickerTrend.UPTREND, type: TickerType.EQUITY, state: TickerState.WATCHED, timeframes: [TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL] })
      );

      const result = await categoryManager.getTickerCategory('FLAG_ONLY');

      expect(result.watch).toBeUndefined();
      expect(result.flag?.id).toBe(FlagCategoryId.UPTREND);
    });

    it('should return watch even when flag is undefined', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'WATCH_ONLY', state: TickerState.READY, trend: undefined, type: TickerType.EQUITY })
      );

      const result = await categoryManager.getTickerCategory('WATCH_ONLY');

      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      expect(result.flag).toBeUndefined();
    });

    // ── FNO-specific tests ──

    it('should return isFno=true when ticker has is_fno flag', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'FNO_TICKER', is_fno: true })
      );

      const result = await categoryManager.getTickerCategory('FNO_TICKER');

      expect(result.isFno).toBe(true);
    });

    it('should return isFno=false when ticker has no is_fno flag', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'NON_FNO', is_fno: false })
      );

      const result = await categoryManager.getTickerCategory('NON_FNO');

      expect(result.isFno).toBe(false);
    });

    it('should cache FNO status even when watch and flag are both undefined', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'FNO_ONLY', is_fno: true, type: TickerType.EQUITY, state: TickerState.WATCHED, trend: undefined })
      );

      // First call — populates cache with isFno=true
      const first = await categoryManager.getTickerCategory('FNO_ONLY');
      expect(first.isFno).toBe(true);
      expect(first.watch).toBeUndefined();
      expect(first.flag).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Second call — cache hit, no backend call
      jest.clearAllMocks();
      const second = await categoryManager.getTickerCategory('FNO_ONLY');
      expect(second.isFno).toBe(true);
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
    });

    it('should return isFno=false when backend lookup fails', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await categoryManager.getTickerCategory('UNKNOWN');

      expect(result.isFno).toBe(false);
    });
  });

  // ── recordWatchCategory ──

  describe('recordWatchCategory', () => {
    it('should update ticker for READY category', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.READY, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { state: TickerState.READY });
    });

    it('should update ticker for INDEX category', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: TickerType.INDEX });
    });

    it('should NOT update backend for COMPOSITE (unsupported)', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.COMPOSITE, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for SET_JOURNAL (journal-derived)', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.SET_JOURNAL, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for RUNNING (journal-derived)', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.RUNNING, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle empty ticker array', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.READY, []);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should evict cache after successful watch update and refetch next lookup', async () => {
      // Populate cache with uncategorized result
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));
      await categoryManager.getTickerCategory('EVICT_ME');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);

      // Record READY — evicts cache before/after update
      await categoryManager.recordWatchCategory(WatchCategoryId.READY, ['EVICT_ME']);
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('EVICT_ME', { state: TickerState.READY });

      // Cache was evicted — next lookup refetches backend
      mockTickerManager.getTicker.mockResolvedValue(makeTicker({ ticker: 'EVICT_ME', state: TickerState.READY }));
      const result = await categoryManager.getTickerCategory('EVICT_ME');
      expect(result.watch?.id).toBe(WatchCategoryId.READY);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should publish TICKER_CATEGORY_CHANGED for supported watch update', async () => {
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);

      await categoryManager.recordWatchCategory(WatchCategoryId.READY, ['TICKER_A', 'TICKER_B']);

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['TICKER_A', 'TICKER_B'],
      });
    });

    it('should NOT publish event for unsupported category', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.COMPOSITE, ['TEST']);

      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should NOT publish event for empty ticker array', async () => {
      await categoryManager.recordWatchCategory(WatchCategoryId.READY, []);

      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });

  // ── recordFlagCategory ──

  describe('recordFlagCategory', () => {
    it('should call updateTicker for SIDEWAYS', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: TickerTrend.SIDEWAYS, type: TickerType.EQUITY, state: TickerState.WATCHED });
    });

    it('should call updateTicker for DOWNTREND', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.DOWNTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: TickerTrend.DOWNTREND, type: TickerType.EQUITY, state: TickerState.WATCHED });
    });

    it('should call updateTicker for CRYPTO', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.CRYPTO, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: TickerType.CRYPTO, state: TickerState.WATCHED });
    });

    it('should call updateTicker for UPTREND', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.UPTREND, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: TickerTrend.UPTREND, type: TickerType.EQUITY, state: TickerState.WATCHED });
    });

    it('should call updateTicker for INDEX', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: TickerType.INDEX, state: TickerState.WATCHED });
    });

    it('should call updateTicker for GOLD_INDEX', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.GOLD_INDEX, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: TickerType.COMPOSITE, state: TickerState.WATCHED });
    });

    it('should evict cache after successful flag update and refetch next lookup', async () => {
      // Prime: cache knows SIDEWAYS
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: TickerTrend.SIDEWAYS })
      );
      await categoryManager.getTickerCategory('TICKER_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);

      // Record DOWNTREND — evicts cache before/after update
      await categoryManager.recordFlagCategory(FlagCategoryId.DOWNTREND, ['TICKER_A']);

      // Cache was evicted — next lookup refetches backend
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: TickerTrend.DOWNTREND })
      );
      const result = await categoryManager.getTickerCategory('TICKER_A');
      expect(result.flag?.id).toBe(FlagCategoryId.DOWNTREND);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should evict cache on backend failure', async () => {
      // Populate: cache has SIDEWAYS
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: TickerTrend.SIDEWAYS })
      );
      await categoryManager.getTickerCategory('TICKER_A');
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // syncBackend will fail
      jest.clearAllMocks();
      mockTickerManager.updateTicker.mockRejectedValue(new Error('Backend error'));

      // Record DOWNTREND — cache evicted on failure
      await categoryManager.recordFlagCategory(FlagCategoryId.DOWNTREND, ['TICKER_A']);

      // Next lookup re-fetches from backend (cache was evicted)
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'TICKER_A', trend: TickerTrend.SIDEWAYS })
      );
      const result = await categoryManager.getTickerCategory('TICKER_A');
      // Falls back to pre-update backend data (SIDEWAYS, not DOWNTREND)
      expect(result.flag?.id).toBe(FlagCategoryId.SIDEWAYS);
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should refetch backend after flag recording and derive fresh categories', async () => {
      // Scenario: ticker is INDEX. User presses F8 (UPTREND). After backend update
      // sets type=EQUITY, next lookup recomputes both watch + flag from fresh data.

      // Prime: cache knows INDEX watch + INDEX flag
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'IND_X', type: TickerType.INDEX })
      );
      let result = await categoryManager.getTickerCategory('IND_X');
      expect(result.watch?.id).toBe(WatchCategoryId.INDEX);
      expect(result.flag?.id).toBe(FlagCategoryId.INDEX);

      // Record UPTREND flag
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);
      jest.clearAllMocks();

      // After UPTREND update, backend would set type=EQUITY, trend=UPTREND
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'IND_X', type: TickerType.EQUITY, trend: TickerTrend.UPTREND })
      );

      await categoryManager.recordFlagCategory(FlagCategoryId.UPTREND, ['IND_X']);

      // Cache was evicted — next lookup refetches from backend
      result = await categoryManager.getTickerCategory('IND_X');
      expect(result.flag?.id).toBe(FlagCategoryId.UPTREND);
      // Watch: EQUITY with DL timeframes → undefined (DEFAULT_DAILY)
      expect(result.watch).toBeUndefined();
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);
    });

    it('should publish TICKER_CATEGORY_CHANGED after flag update', async () => {
      mockTickerManager.updateTicker.mockResolvedValue(undefined as any);

      await categoryManager.recordFlagCategory(FlagCategoryId.UPTREND, ['FLAG_A', 'FLAG_B']);

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['FLAG_A', 'FLAG_B'],
      });
    });

    it('should handle empty ticker array', async () => {
      await categoryManager.recordFlagCategory(FlagCategoryId.SIDEWAYS, []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── toggleReadyState ──

  describe('toggleReadyState', () => {
    it('should toggle READY ticker to WATCHED and publish event', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'READY_A', state: TickerState.READY })
      );

      await categoryManager.toggleReadyState('READY_A');

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('READY_A', { state: TickerState.WATCHED });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['READY_A'],
      });
    });

    it('should toggle WATCHED ticker to READY and publish event', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'WATCHED_A', state: TickerState.WATCHED })
      );

      await categoryManager.toggleReadyState('WATCHED_A');

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('WATCHED_A', { state: TickerState.READY });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['WATCHED_A'],
      });
    });
  });

  // ── clearReadyState ──

  describe('clearReadyState', () => {
    it('should clear READY ticker to WATCHED and publish event', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'READY_A', state: TickerState.READY })
      );

      await categoryManager.clearReadyState(['READY_A']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('READY_A', { state: TickerState.WATCHED });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['READY_A'],
      });
    });

    it('should skip WATCHED ticker without marking it READY', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockResolvedValue(
        makeTicker({ ticker: 'WATCHED_A', state: TickerState.WATCHED })
      );

      await categoryManager.clearReadyState(['WATCHED_A']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it('should publish only actually-cleared tickers from mixed list', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockImplementation(async (ticker: string) => {
        if (ticker === 'READY_T') return makeTicker({ ticker: 'READY_T', state: TickerState.READY });
        return makeTicker({ ticker: 'WATCHED_T', state: TickerState.WATCHED });
      });

      await categoryManager.clearReadyState(['READY_T', 'WATCHED_T']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('READY_T', { state: TickerState.WATCHED });
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalledWith('WATCHED_T', { state: TickerState.READY });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['READY_T'],
      });
    });

    it('should not update or publish for empty ticker array', async () => {
      await categoryManager.clearReadyState([]);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
