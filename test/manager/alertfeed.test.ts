import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ICategoryManager } from '../../src/manager/category';
import { IRecentManager } from '../../src/manager/recent';
import { FeedState } from '../../src/models/alertfeed';
import { Constants } from '../../src/models/constant';
import { AlertTicker } from '../../src/models/alert_ticker';
import { WatchCategoryId } from '../../src/models/watch';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'RELIANCE',
    pair_id: 'pair1',
    name: 'Reliance Industries',
    exchange: 'NSE',
    ticker: 'NSE:RELIANCE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AlertTickerManager
    mockAlertTickerManager = {
      fetchAlertTicker: jest.fn(),
      getAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as any;

    // Mock CategoryManager
    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
    } as any;

    // Mock RecentManager
    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn(),
    } as any;

    alertFeedManager = new AlertFeedManager(mockAlertTickerManager, mockCategoryManager, mockRecentManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('getAlertFeedState', () => {
    it('should return UNMAPPED state when ticker cannot be found', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);

      const result = await alertFeedManager.getAlertFeedState('UNKNOWN_TICKER');

      expect(result).toEqual({
        state: FeedState.UNMAPPED,
        color: 'red',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('UNKNOWN_TICKER');
    });

    it('should return WATCHED state when ticker has a watch category', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:RELIANCE' }));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: { state: 'READY' } },
        flag: undefined,
      });

      const result = await alertFeedManager.getAlertFeedState('RELIANCE');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('NSE:RELIANCE');
    });

    it('should return RECENT state when ticker is recent but not watched', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:TCS' }));
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined });
      mockRecentManager.isRecent.mockReturnValue(true);

      const result = await alertFeedManager.getAlertFeedState('TCS');

      expect(result).toEqual({
        state: FeedState.RECENT,
        color: 'lime',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('TCS');
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('NSE:TCS');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:TCS', Constants.RECENT_CUTOFF_MS);
    });

    it('should return MAPPED state when ticker is mapped but not watched or recent', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:HDFC' }));
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined });
      mockRecentManager.isRecent.mockReturnValue(false);

      const result = await alertFeedManager.getAlertFeedState('HDFC');

      expect(result).toEqual({
        state: FeedState.MAPPED,
        color: 'white',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('HDFC');
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('NSE:HDFC');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:HDFC', Constants.RECENT_CUTOFF_MS);
    });
  });
});
