import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentManager } from '../../src/manager/recent';
import { FeedState } from '../../src/models/alertfeed';
import { Constants } from '../../src/models/constant';
import { AlertTicker } from '../../src/models/alert_ticker';

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
      getCategory: jest.fn(),
      computeDefaultList: jest.fn(),
      recordCategory: jest.fn(),
      isWatched: jest.fn(),
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

    it('should return WATCHED state when ticker is watched', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:RELIANCE' }));
      mockWatchManager.isWatched.mockReturnValue(true);

      const result = await alertFeedManager.getAlertFeedState('RELIANCE');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:RELIANCE');
    });

    it('should return RECENT state when ticker is recent but not watched', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:TCS' }));
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(true);

      const result = await alertFeedManager.getAlertFeedState('TCS');

      expect(result).toEqual({
        state: FeedState.RECENT,
        color: 'lime',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('TCS');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:TCS');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:TCS', Constants.RECENT_CUTOFF_MS);
    });

    it('should return MAPPED state when ticker is mapped but not watched or recent', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ ticker: 'NSE:HDFC' }));
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      const result = await alertFeedManager.getAlertFeedState('HDFC');

      expect(result).toEqual({
        state: FeedState.MAPPED,
        color: 'white',
      });
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('HDFC');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:HDFC');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:HDFC', Constants.RECENT_CUTOFF_MS);
    });
  });

  describe('createAlertFeedEvent', () => {
    it('should create and store alert feed event successfully', async () => {
      const tvTicker = 'NSE:RELIANCE';

      mockAlertTickerManager.getAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'RELIANCE', ticker: tvTicker }));
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'RELIANCE', ticker: tvTicker }));
      mockWatchManager.isWatched.mockReturnValue(true);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      expect(mockAlertTickerManager.getAlertTicker).toHaveBeenCalledWith(tvTicker);
      expect(GM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, expect.any(String));
    });

    it('should throw error when ticker cannot be converted', async () => {
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(null);

      await expect(alertFeedManager.createAlertFeedEvent('INVALID_TICKER')).rejects.toThrow(
        'Failed to convert ticker: INVALID_TICKER'
      );

      expect(mockAlertTickerManager.getAlertTicker).toHaveBeenCalledWith('INVALID_TICKER');
      expect(GM.setValue).not.toHaveBeenCalled();
    });

    it('should create event with correct feed state', async () => {
      const tvTicker = 'NSE:TCS';

      mockAlertTickerManager.getAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'TCS', ticker: tvTicker }));
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'TCS', ticker: tvTicker }));
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(true);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      expect(GM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, expect.any(String));

      // Verify the stored event contains correct data
      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.investingTicker).toBe('TCS');
      expect(storedEvent.feedInfo.state).toBe(FeedState.RECENT);
      expect(storedEvent.feedInfo.color).toBe('lime');
    });
  });

  describe('createResetFeedEvent', () => {
    it('should create reset feed event with correct values', async () => {
      await alertFeedManager.createResetFeedEvent();

      expect(GM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, expect.any(String));

      // Verify the stored event contains correct reset data
      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.investingTicker).toBe(Constants.MISC.RESET_FEED);
      expect(storedEvent.feedInfo.state).toBe(FeedState.UNMAPPED);
      expect(storedEvent.feedInfo.color).toBe('red');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from tv ticker to stored event', async () => {
      const tvTicker = 'NSE:NIFTY';

      mockAlertTickerManager.getAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'NIFTY', ticker: tvTicker }));
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'NIFTY', ticker: tvTicker }));
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      // Verify dependencies were called correctly
      expect(mockAlertTickerManager.getAlertTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('NIFTY');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith(tvTicker);
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith(tvTicker, Constants.RECENT_CUTOFF_MS);

      // Verify event was stored
      expect(GM.setValue).toHaveBeenCalledTimes(1);
      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.investingTicker).toBe('NIFTY');
      expect(storedEvent.feedInfo.state).toBe(FeedState.MAPPED);
      expect(storedEvent.feedInfo.color).toBe('white');
    });

    it('should prioritize WATCHED over RECENT state', async () => {
      const tvTicker = 'NSE:BANKNIFTY';

      mockAlertTickerManager.getAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'BANKNIFTY', ticker: tvTicker }));
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'BANKNIFTY', ticker: tvTicker }));
      mockWatchManager.isWatched.mockReturnValue(true);
      mockRecentManager.isRecent.mockReturnValue(true); // Both are true, but WATCHED should take priority

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.feedInfo.state).toBe(FeedState.WATCHED);
      expect(storedEvent.feedInfo.color).toBe('yellow');
    });
  });

  describe('error handling', () => {
    it('should handle GM.setValue errors gracefully', async () => {
      const gmError = new Error('Storage failed');
      (GM.setValue as jest.Mock).mockRejectedValue(gmError);

      mockAlertTickerManager.getAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'RELIANCE', ticker: 'NSE:RELIANCE' }));
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(makeAlertTicker({ symbol: 'RELIANCE', ticker: 'NSE:RELIANCE' }));
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      await expect(alertFeedManager.createAlertFeedEvent('NSE:RELIANCE')).rejects.toThrow('Storage failed');
    });

    it('should handle null/undefined ticker inputs', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);

      const result = await alertFeedManager.getAlertFeedState('');

      expect(result.state).toBe(FeedState.UNMAPPED);
      expect(result.color).toBe('red');
    });
  });
});
