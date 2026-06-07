import { WatchManager, IWatchManager } from '../../src/manager/watch';
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
      exchange: null,
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

    it('should return SET_JOURNAL when SET journal exists', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'SET') return [{ ticker: 'SET_1' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('SET_1');

      expect(result?.id).toBe(WatchCategoryId.SET_JOURNAL);
      expect(result?.color).toBe('orange');
    });

    it('should return RUNNING_JOURNAL when RUNNING journal exists', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'RUNNING') return [{ ticker: 'RUN_1' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('RUN_1');

      expect(result?.id).toBe(WatchCategoryId.RUNNING_JOURNAL);
      expect(result?.color).toBe('lime');
    });

    it('should prefer SET over RUNNING when both exist', async () => {
      mockJournalManager.listJournals.mockImplementation(async (params: any) => {
        if (params.status === 'SET') return [{ ticker: 'DUAL' }] as any;
        if (params.status === 'RUNNING') return [{ ticker: 'DUAL' }] as any;
        return [];
      });

      const result = await watchManager.getTickerCategory('DUAL');

      expect(result?.id).toBe(WatchCategoryId.SET_JOURNAL);
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

    it('should query journals with ticker filter', async () => {
      mockJournalManager.listJournals.mockResolvedValue([]);
      mockTickerManager.getTicker.mockRejectedValue(new Error('not found'));

      await watchManager.getTickerCategory('SOME_TICKER');

      expect(mockJournalManager.listJournals).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'SOME_TICKER', status: 'SET' })
      );
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

    it('should NOT update backend for RUNNING_JOURNAL (journal-derived)', () => {
      watchManager.recordCategory(WatchCategoryId.RUNNING_JOURNAL, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle empty ticker array', () => {
      watchManager.recordCategory(WatchCategoryId.READY, []);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });

  describe('classifyTickers', () => {
    it('should return empty buckets and uncategorized for empty input', async () => {
      const result = await watchManager.classifyTickers([]);

      expect(result.buckets.size).toBe(0);
      expect(result.uncategorized.size).toBe(0);
    });

    it('should bucket tickers by category', async () => {
      // SET journal tickers
      mockJournalManager.listJournals.mockImplementation(async (filter: any) => {
        if (filter.status === 'SET' && filter.ticker === 'SET1') return [{ ticker: 'SET1' }] as any;
        if (filter.status === 'SET' && filter.ticker === 'SET2') return [{ ticker: 'SET2' }] as any;
        return [];
      });

      const result = await watchManager.classifyTickers(['SET1', 'SET2', 'UNCAT']);

      // Both SET1 and SET2 in SET_JOURNAL bucket
      const setBucket = result.buckets.get(WatchCategoryId.SET_JOURNAL);
      expect(setBucket?.size).toBe(2);
      expect(setBucket?.has('SET1')).toBe(true);
      expect(setBucket?.has('SET2')).toBe(true);

      // UNCAT uncategorized
      expect(result.uncategorized.has('UNCAT')).toBe(true);
      expect(result.uncategorized.size).toBe(1);
    });

    it('should bucket mixed categories correctly', async () => {
      mockJournalManager.listJournals.mockImplementation(async (filter: any) => {
        if (filter.status === 'SET' && filter.ticker === 'JOURNAL_TICKER') return [{ ticker: 'JOURNAL_TICKER' }] as any;
        return [];
      });

      mockTickerManager.getTicker.mockImplementation(async (ticker: string) => {
        if (ticker === 'READY_TICKER') return { state: 'READY' } as Ticker;
        throw new Error('not found');
      });

      const result = await watchManager.classifyTickers(['JOURNAL_TICKER', 'READY_TICKER', 'UNKNOWN']);

      expect(result.buckets.get(WatchCategoryId.SET_JOURNAL)?.has('JOURNAL_TICKER')).toBe(true);
      expect(result.buckets.get(WatchCategoryId.READY)?.has('READY_TICKER')).toBe(true);
      expect(result.uncategorized.has('UNKNOWN')).toBe(true);
    });

    it('should compose getTickerCategory (no new classification logic)', async () => {
      // SET journal takes priority over ticker-derived
      mockJournalManager.listJournals.mockImplementation(async (filter: any) => {
        if (filter.status === 'SET' && filter.ticker === 'PRIORITY') return [{ ticker: 'PRIORITY' }] as any;
        return [];
      });

      // Even if ticker says READY, journal wins
      mockTickerManager.getTicker.mockResolvedValue({ state: 'READY' } as Ticker);

      const result = await watchManager.classifyTickers(['PRIORITY']);

      // Should be SET_JOURNAL, not READY
      expect(result.buckets.get(WatchCategoryId.SET_JOURNAL)?.has('PRIORITY')).toBe(true);
      expect(result.buckets.get(WatchCategoryId.READY)).toBeUndefined();
    });
  });
});
