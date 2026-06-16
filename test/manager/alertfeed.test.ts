import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IRecentManager } from '../../src/manager/recent';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { FeedState } from '../../src/models/alertfeed';
import { Constants } from '../../src/models/constant';

// Mock GM global (for createAlertFeedEvent / createResetFeedEvent)
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockRecentManager: jest.Mocked<IRecentManager>;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock RecentManager
    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn(),
    } as any;

    // Mock WatchlistManager
    mockWatchlistManager = {
      refresh: jest.fn(),
      refreshSummary: jest.fn(),
      getWatchlistTickers: jest.fn(),
    } as any;

    alertFeedManager = new AlertFeedManager(mockRecentManager, mockWatchlistManager);

    // Default: empty watchlist snapshot
    mockWatchlistManager.getWatchlistTickers.mockResolvedValue(new Set());
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('getAlertFeedState', () => {
    it('should return UNMAPPED state when null is passed', async () => {
      const result = await alertFeedManager.getAlertFeedState(null);

      expect(result).toEqual({
        state: FeedState.UNMAPPED,
        color: 'red',
      });
      expect(mockWatchlistManager.getWatchlistTickers).not.toHaveBeenCalled();
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    it('should return WATCHED state when ticker exists in watchlist snapshot', async () => {
      mockWatchlistManager.getWatchlistTickers.mockResolvedValue(new Set(['NSE:RELIANCE']));
      mockRecentManager.isRecent.mockResolvedValue(true); // would be recent too, but WATCHED wins

      const result = await alertFeedManager.getAlertFeedState('NSE:RELIANCE');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });

      expect(mockWatchlistManager.getWatchlistTickers).toHaveBeenCalled();
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    it('should return WATCHED before RECENT when ticker is both watched and recent', async () => {
      mockWatchlistManager.getWatchlistTickers.mockResolvedValue(new Set(['NSE:TICKER']));
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await alertFeedManager.getAlertFeedState('NSE:TICKER');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });
      // isRecent should NOT be called because WATCHED short-circuits
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    it('should return RECENT state when ticker is recent but absent from watchlist snapshot', async () => {
      mockWatchlistManager.getWatchlistTickers.mockResolvedValue(new Set(['NSE:OTHER']));
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await alertFeedManager.getAlertFeedState('NSE:TCS');

      expect(result).toEqual({
        state: FeedState.RECENT,
        color: 'lime',
      });

      expect(mockWatchlistManager.getWatchlistTickers).toHaveBeenCalled();
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:TCS', Constants.RECENT_CUTOFF_MS);
    });

    it('should return MAPPED state when ticker is mapped but not watched or recent', async () => {
      mockWatchlistManager.getWatchlistTickers.mockResolvedValue(new Set());
      mockRecentManager.isRecent.mockResolvedValue(false);

      const result = await alertFeedManager.getAlertFeedState('NSE:HDFC');

      expect(result).toEqual({
        state: FeedState.MAPPED,
        color: 'white',
      });

      expect(mockWatchlistManager.getWatchlistTickers).toHaveBeenCalled();
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:HDFC', Constants.RECENT_CUTOFF_MS);
    });
  });
});
