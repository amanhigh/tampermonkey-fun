import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IWatchManager } from '../../src/manager/watch';
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
  let mockWatchManager: jest.Mocked<IWatchManager>;
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

    // Mock WatchManager
    mockWatchManager = {
      getTickerCategory: jest.fn(),
      getTickerCategories: jest.fn(),
      recordCategory: jest.fn(),
    } as any;

    // Mock RecentManager
    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn(),
    } as any;

    alertFeedManager = new AlertFeedManager(mockAlertTickerManager, mockWatchManager, mockRecentManager);
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
      mockWatchManager.getTickerCategory.mockResolvedValue({
        id: WatchCategoryId.READY,
        color: 'red',
        label: 'Ready',
        recordUpdate: { state: 'READY' },
      });

      const result = await alertFeedManager.getAlertFeedState('RELIANCE');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith('NSE:RELIANCE');
    });

    it('should return RECENT state when ticker is recent but not watched', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:TCS' }));
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockRecentManager.isRecent.mockReturnValue(true);

      const result = await alertFeedManager.getAlertFeedState('TCS');

      expect(result).toEqual({
        state: FeedState.RECENT,
        color: 'lime',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('TCS');
      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith('NSE:TCS');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:TCS', Constants.RECENT_CUTOFF_MS);
    });

    it('should return MAPPED state when ticker is mapped but not watched or recent', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:HDFC' }));
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockRecentManager.isRecent.mockReturnValue(false);

      const result = await alertFeedManager.getAlertFeedState('HDFC');

      expect(result).toEqual({
        state: FeedState.MAPPED,
        color: 'white',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('HDFC');
      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith('NSE:HDFC');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:HDFC', Constants.RECENT_CUTOFF_MS);
    });
  });
});
