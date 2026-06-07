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
      getTicker: jest.fn(),
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
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('UNKNOWN');

      expect(result).toBeUndefined();
    });

    it('should return SET_JOURNAL when ticker has SET journal', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockImplementation((params: any) => {
        if (params.status === 'SET') return Promise.resolve([{ ticker: 'SET_1' }] as any);
        return Promise.resolve([]);
      });

      const result = await watchManager.getTickerCategory('SET_1');

      expect(result?.id).toBe(WatchCategoryId.SET_JOURNAL);
      expect(result?.color).toBe('orange');
    });

    it('should return RUNNING_JOURNAL when ticker has RUNNING journal', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockImplementation((params: any) => {
        if (params.status === 'RUNNING') return Promise.resolve([{ ticker: 'RUN_1' }] as any);
        return Promise.resolve([]);
      });

      const result = await watchManager.getTickerCategory('RUN_1');

      expect(result?.id).toBe(WatchCategoryId.RUNNING_JOURNAL);
      expect(result?.color).toBe('lime');
    });

    it('should return READY when ticker state is READY', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'READY_A', state: 'READY' }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('READY_A');

      expect(result?.id).toBe(WatchCategoryId.READY);
    });

    it('should return LONG_NSE for long-watch NSE ticker', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'LONG_NSE', exchange: 'NSE', timeframes: ['MN', 'WK'] }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('LONG_NSE');

      expect(result?.id).toBe(WatchCategoryId.LONG_NSE);
    });

    it('should return LONG_NON_NSE for long-watch non-NSE ticker', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'LONG_US', exchange: 'NASDAQ', timeframes: ['MN', 'WK'] }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('LONG_US');

      expect(result?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('should return INDEX for market instrument types', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'IND_A', type: 'INDEX' }),
        makeTicker({ ticker: 'COM_A', type: 'COMMODITY' }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const indResult = await watchManager.getTickerCategory('IND_A');
      const comResult = await watchManager.getTickerCategory('COM_A');

      expect(indResult?.id).toBe(WatchCategoryId.INDEX);
      expect(comResult?.id).toBe(WatchCategoryId.INDEX);
    });

    it('should return COMPOSITE for composite ticker', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'COMP_A', type: 'COMPOSITE' }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('COMP_A');

      expect(result?.id).toBe(WatchCategoryId.COMPOSITE);
    });

    it('should return DEFAULT_DAILY when ticker is in fallback watchlist', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('WATCH_TICKER', ['WATCH_TICKER', 'OTHER']);

      expect(result?.id).toBe(WatchCategoryId.DEFAULT_DAILY);
    });

    it('should NOT return DEFAULT_DAILY without fallback watchlist', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const result = await watchManager.getTickerCategory('WATCH_TICKER');

      expect(result).toBeUndefined();
    });

    it('should call backend fresh every invocation (no snapshot)', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'A', state: 'READY' }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      await watchManager.getTickerCategory('A');
      await watchManager.getTickerCategory('A');

      expect(mockTickerManager.listTickers).toHaveBeenCalledTimes(2);
    });

    it('should prefer SET_JOURNAL over ticker-derived category', async () => {
      // Ticker exists as READY in backend but also has SET journal
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'DUAL', state: 'READY' }),
      ]);
      mockJournalManager.listJournals.mockImplementation((params: any) => {
        if (params.status === 'SET') return Promise.resolve([{ ticker: 'DUAL' }] as any);
        return Promise.resolve([]);
      });

      const result = await watchManager.getTickerCategory('DUAL');

      // Journal should win over ticker state
      expect(result?.id).toBe(WatchCategoryId.SET_JOURNAL);
    });
  });

  // ── getTickerCategories ──

  describe('getTickerCategories', () => {
    it('should classify multiple tickers in one backend call', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'READY_A', state: 'READY' }),
        makeTicker({ ticker: 'INDEX_A', type: 'INDEX' }),
      ]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const map = await watchManager.getTickerCategories(['READY_A', 'INDEX_A', 'UNKNOWN']);

      expect(map.get('READY_A')?.id).toBe(WatchCategoryId.READY);
      expect(map.get('INDEX_A')?.id).toBe(WatchCategoryId.INDEX);
      expect(map.get('UNKNOWN')).toBeUndefined();
      expect(mockTickerManager.listTickers).toHaveBeenCalledTimes(1);
    });

    it('should return empty map for empty input', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalManager.listJournals.mockResolvedValue([]);

      const map = await watchManager.getTickerCategories([]);

      expect(map.size).toBe(0);
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

    it('should NOT update backend for DEFAULT_DAILY (unsupported)', () => {
      watchManager.recordCategory(WatchCategoryId.DEFAULT_DAILY, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });
});
