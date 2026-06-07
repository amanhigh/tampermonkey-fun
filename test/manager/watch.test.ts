import { WatchManager, IWatchManager } from '../../src/manager/watch';
import { ITickerManager } from '../../src/manager/ticker';
import { IJournalClient } from '../../src/client/journal';
import { Ticker } from '../../src/models/ticker';
import { WATCH_CATEGORY_COUNT } from '../../src/models/watch';

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
  let mockJournalClient: jest.Mocked<IJournalClient>;

  // ── Helpers ──

  async function waitForAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

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

    mockJournalClient = {
      listJournals: jest.fn().mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } }),
      createJournal: jest.fn(),
      addJournalImage: jest.fn(),
      addJournalTag: jest.fn(),
      updateJournalStatus: jest.fn(),
      getBaseUrl: jest.fn(),
    } as unknown as jest.Mocked<IJournalClient>;

    watchManager = new WatchManager(mockTickerManager, mockJournalClient);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(watchManager).toBeDefined();
      expect(watchManager).toBeInstanceOf(WatchManager);
    });

    it('should NOT call backend on construction', () => {
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
      expect(mockJournalClient.listJournals).not.toHaveBeenCalled();
    });

    it('should return empty sets for all categories before any refresh', () => {
      for (let i = 0; i < WATCH_CATEGORY_COUNT; i++) {
        expect(watchManager.getCategory(i)).toBeInstanceOf(Set);
        expect(watchManager.getCategory(i).size).toBe(0);
      }
    });
  });

  // ── getCategory ──

  describe('getCategory', () => {
    it('should return empty set for valid index before refresh', () => {
      const result = watchManager.getCategory(3);
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should throw error for negative category index', () => {
      expect(() => watchManager.getCategory(-1)).toThrow('Invalid category index: -1');
    });

    it('should throw error for category index >= TOTAL_CATEGORIES', () => {
      expect(() => watchManager.getCategory(WATCH_CATEGORY_COUNT)).toThrow(
        `Invalid category index: ${WATCH_CATEGORY_COUNT}`
      );
    });

    it('should return populated category after backend refresh', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'READY_A', state: 'READY' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category1 = watchManager.getCategory(1);
      expect(category1.has('READY_A')).toBe(true);
    });
  });

  // ── getDefaultWatchlist ──

  describe('getDefaultWatchlist', () => {
    it('should return empty set before any refresh', () => {
      const result = watchManager.getDefaultWatchlist();
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should return category 5 as default watchlist', () => {
      // Manually trigger first call with TV tickers to set fallback
      watchManager.computeDefaultList(['DEFAULT_A', 'DEFAULT_B']);

      // Before async refresh resolves, fallback populates category 5
      const result = watchManager.getDefaultWatchlist();
      expect(result.has('DEFAULT_A')).toBe(true);
      expect(result.has('DEFAULT_B')).toBe(true);
    });
  });

  // ── computeDefaultList / backend refresh ──

  describe('computeDefaultList (backend refresh)', () => {
    it('should fire backend refresh with tickers and journals', () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList(['TV_A', 'TV_B']);

      expect(mockTickerManager.listTickers).toHaveBeenCalledWith({});
      expect(mockJournalClient.listJournals).toHaveBeenCalledTimes(2);
      expect(mockJournalClient.listJournals).toHaveBeenCalledWith(expect.objectContaining({ status: 'SET' }));
      expect(mockJournalClient.listJournals).toHaveBeenCalledWith(expect.objectContaining({ status: 'RUNNING' }));
    });

    it('should map SET journal tickers to category 0', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      // Mock SET journals returning tickers
      const mockSetJournal = { ticker: 'SET_1' };
      const mockSetJournal2 = { ticker: 'SET_2' };
      mockJournalClient.listJournals.mockImplementation((params: any) => {
        if (params.status === 'SET') return Promise.resolve({ journals: [mockSetJournal, mockSetJournal2] as any, metadata: { total: 2, offset: 0, limit: 100 } });
        return Promise.resolve({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });
      });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category0 = watchManager.getCategory(0);
      expect(category0.has('SET_1')).toBe(true);
      expect(category0.has('SET_2')).toBe(true);
    });

    it('should map RUNNING journal tickers to category 4', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);
      const mockRunningJournal = { ticker: 'RUN_1' };
      const mockRunningJournal2 = { ticker: 'RUN_2' };
      mockJournalClient.listJournals.mockImplementation((params: any) => {
        if (params.status === 'RUNNING') return Promise.resolve({ journals: [mockRunningJournal, mockRunningJournal2] as any, metadata: { total: 2, offset: 0, limit: 100 } });
        return Promise.resolve({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });
      });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category4 = watchManager.getCategory(4);
      expect(category4.has('RUN_1')).toBe(true);
      expect(category4.has('RUN_2')).toBe(true);
    });

    it('should map READY tickers to category 1', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'R_STATE', state: 'READY' }),
        makeTicker({ ticker: 'W_STATE', state: 'WATCHED' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category1 = watchManager.getCategory(1);
      expect(category1.has('R_STATE')).toBe(true);
      expect(category1.has('W_STATE')).toBe(false);
    });

    it('should map long NSE tickers to category 2', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'LONG_NSE', exchange: 'NSE', timeframes: ['MN', 'WK'] }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category2 = watchManager.getCategory(2);
      expect(category2.has('LONG_NSE')).toBe(true);
    });

    it('should map long non-NSE tickers to category 3', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'LONG_US', exchange: 'NASDAQ', timeframes: ['MN', 'WK'] }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category3 = watchManager.getCategory(3);
      expect(category3.has('LONG_US')).toBe(true);
    });

    it('should map INDEX/COMMODITY/FX/BOND tickers to category 6', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'IND_A', type: 'INDEX' }),
        makeTicker({ ticker: 'COM_A', type: 'COMMODITY' }),
        makeTicker({ ticker: 'FX_A', type: 'FX' }),
        makeTicker({ ticker: 'BND_A', type: 'BOND' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category6 = watchManager.getCategory(6);
      expect(category6.has('IND_A')).toBe(true);
      expect(category6.has('COM_A')).toBe(true);
      expect(category6.has('FX_A')).toBe(true);
      expect(category6.has('BND_A')).toBe(true);
    });

    it('should map COMPOSITE tickers to category 7', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'COMP_A', type: 'COMPOSITE' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const category7 = watchManager.getCategory(7);
      expect(category7.has('COMP_A')).toBe(true);
    });

    it('should place unassigned TV tickers into category 5 (default)', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ASSIGNED_1', state: 'READY' }), // goes to category 1
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList(['ASSIGNED_1', 'DEFAULT_1', 'DEFAULT_2']);
      await waitForAsync();

      // ASSIGNED_1 should be in category 1, not category 5
      const category1 = watchManager.getCategory(1);
      expect(category1.has('ASSIGNED_1')).toBe(true);

      // DEFAULT_1 and DEFAULT_2 should go to category 5
      const category5 = watchManager.getCategory(5);
      expect(category5.has('ASSIGNED_1')).toBe(false);
      expect(category5.has('DEFAULT_1')).toBe(true);
      expect(category5.has('DEFAULT_2')).toBe(true);
    });

    it('should handle backend failure gracefully', async () => {
      mockTickerManager.listTickers.mockRejectedValue(new Error('Backend down'));

      watchManager.computeDefaultList(['TV_A']);
      await waitForAsync();

      // Snapshot falls back to TV tickers in category 5 on first call
      expect(watchManager.getCategory(5).has('TV_A')).toBe(true);
    });
  });

  // ── recordCategory ──

  describe('recordCategory', () => {
    it('should update ticker state to READY for category 1', () => {
      watchManager.recordCategory(1, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { state: 'READY' });
    });

    it('should update ticker type to INDEX for category 6', () => {
      watchManager.recordCategory(6, ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should NOT update backend for category 7 (unsupported)', () => {
      watchManager.recordCategory(7, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for category 0 (journal-derived)', () => {
      watchManager.recordCategory(0, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should NOT update backend for category 4 (journal-derived)', () => {
      watchManager.recordCategory(4, ['TEST']);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle empty ticker array', () => {
      watchManager.recordCategory(1, []);

      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── isWatched ──

  describe('isWatched', () => {
    it('should return false before any refresh', () => {
      expect(watchManager.isWatched('ANY')).toBe(false);
    });

    it('should return true after backend populates a category', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'WATCHED_A', state: 'READY' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      expect(watchManager.isWatched('WATCHED_A')).toBe(true);
    });

    it('should return false for ticker not in any category', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'PRESENT', state: 'READY' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      expect(watchManager.isWatched('ABSENT')).toBe(false);
    });
  });

  // ── evictTicker ──

  describe('evictTicker', () => {
    it('should be a no-op for backend-derived categories', () => {
      const result = watchManager.evictTicker('ANY');
      expect(result).toBe(false);
    });
  });

  // ── Cleanup ──

  describe('dryRunClean', () => {
    it('should return 0 when all TV tickers are in snapshot', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'TV_A', state: 'READY' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      const result = watchManager.dryRunClean(['TV_A']);
      expect(result).toBe(0);
    });
  });

  describe('clean', () => {
    it('should remove items from snapshot and return count', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'STALE', state: 'READY' }),
        makeTicker({ ticker: 'KEEP', state: 'READY' }),
      ]);
      mockJournalClient.listJournals.mockResolvedValue({ journals: [], metadata: { total: 0, offset: 0, limit: 100 } });

      watchManager.computeDefaultList([]);
      await waitForAsync();

      // STALE is in the snapshot but not in current TV tickers
      const result = watchManager.clean(['KEEP']);
      expect(result).toBe(1);

      // Verify KEEP remained and STALE was removed
      expect(watchManager.isWatched('STALE')).toBe(false);
      expect(watchManager.isWatched('KEEP')).toBe(true);
    });
  });
});
