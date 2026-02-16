import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { ISymbolManager } from '../../src/manager/symbol';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentManager } from '../../src/manager/recent';
import { FeedState } from '../../src/models/alertfeed';
import { Constants } from '../../src/models/constant';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SymbolManager
    mockSymbolManager = {
      kiteToTv: jest.fn(),
      tvToKite: jest.fn(),
      tvToInvesting: jest.fn(),
      investingToTv: jest.fn(),
      tvToExchangeTicker: jest.fn(),
      createTvToInvestingMapping: jest.fn(),
      removeTvToInvestingMapping: jest.fn(),
      createTvToExchangeTickerMapping: jest.fn(),
      isComposite: jest.fn(),
      removeTvToExchangeTickerMapping: jest.fn(),
      deleteTvTicker: jest.fn(),
    };

    // Mock WatchManager
    mockWatchManager = {
      getCategory: jest.fn(),
      getDefaultWatchlist: jest.fn(),
      computeDefaultList: jest.fn(),
      recordCategory: jest.fn(),
      evictTicker: jest.fn(),
      dryRunClean: jest.fn(),
      clean: jest.fn(),
      isWatched: jest.fn(),
    };

    // Mock RecentManager
    mockRecentManager = {
      addTicker: jest.fn(),
      isRecent: jest.fn(),
      clearRecent: jest.fn(),
      paintRecent: jest.fn(),
    };

    alertFeedManager = new AlertFeedManager(mockSymbolManager, mockWatchManager, mockRecentManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('getAlertFeedState', () => {
    it('should return UNMAPPED state when ticker cannot be mapped', () => {
      mockSymbolManager.investingToTv.mockReturnValue(null);

      const result = alertFeedManager.getAlertFeedState('UNKNOWN_TICKER');

      expect(result).toEqual({
        state: FeedState.UNMAPPED,
        color: 'red',
      });
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('UNKNOWN_TICKER');
    });

    it('should return WATCHED state when ticker is watched', () => {
      mockSymbolManager.investingToTv.mockReturnValue('NSE:RELIANCE');
      mockWatchManager.isWatched.mockReturnValue(true);

      const result = alertFeedManager.getAlertFeedState('RELIANCE');

      expect(result).toEqual({
        state: FeedState.WATCHED,
        color: 'yellow',
      });
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('RELIANCE');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:RELIANCE');
    });

    it('should return RECENT state when ticker is recent but not watched', () => {
      mockSymbolManager.investingToTv.mockReturnValue('NSE:TCS');
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(true);

      const result = alertFeedManager.getAlertFeedState('TCS');

      expect(result).toEqual({
        state: FeedState.RECENT,
        color: 'lime',
      });
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('TCS');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:TCS');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:TCS');
    });

    it('should return MAPPED state when ticker is mapped but not watched or recent', () => {
      mockSymbolManager.investingToTv.mockReturnValue('NSE:HDFC');
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      const result = alertFeedManager.getAlertFeedState('HDFC');

      expect(result).toEqual({
        state: FeedState.MAPPED,
        color: 'white',
      });
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('HDFC');
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith('NSE:HDFC');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('NSE:HDFC');
    });
  });

  describe('createAlertFeedEvent', () => {
    it('should create and store alert feed event successfully', async () => {
      const tvTicker = 'NSE:RELIANCE';
      const investingTicker = 'RELIANCE';

      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);
      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.isWatched.mockReturnValue(true);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      expect(mockSymbolManager.tvToInvesting).toHaveBeenCalledWith(tvTicker);
      expect(GM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, expect.any(String));
    });

    it('should throw error when ticker cannot be converted', async () => {
      mockSymbolManager.tvToInvesting.mockReturnValue(null);

      await expect(alertFeedManager.createAlertFeedEvent('INVALID_TICKER')).rejects.toThrow(
        'Failed to convert ticker: INVALID_TICKER'
      );

      expect(mockSymbolManager.tvToInvesting).toHaveBeenCalledWith('INVALID_TICKER');
      expect(GM.setValue).not.toHaveBeenCalled();
    });

    it('should create event with correct feed state', async () => {
      const tvTicker = 'NSE:TCS';
      const investingTicker = 'TCS';

      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);
      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(true);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      expect(GM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, expect.any(String));

      // Verify the stored event contains correct data
      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.investingTicker).toBe(investingTicker);
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
      const investingTicker = 'NIFTY';

      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);
      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      await alertFeedManager.createAlertFeedEvent(tvTicker);

      // Verify all dependencies were called correctly
      expect(mockSymbolManager.tvToInvesting).toHaveBeenCalledWith(tvTicker);
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith(investingTicker);
      expect(mockWatchManager.isWatched).toHaveBeenCalledWith(tvTicker);
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith(tvTicker);

      // Verify event was stored
      expect(GM.setValue).toHaveBeenCalledTimes(1);
      const storedEventString = (GM.setValue as jest.Mock).mock.calls[0][1];
      const storedEvent = JSON.parse(storedEventString);
      expect(storedEvent.investingTicker).toBe(investingTicker);
      expect(storedEvent.feedInfo.state).toBe(FeedState.MAPPED);
      expect(storedEvent.feedInfo.color).toBe('white');
    });

    it('should prioritize WATCHED over RECENT state', async () => {
      const tvTicker = 'NSE:BANKNIFTY';
      const investingTicker = 'BANKNIFTY';

      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);
      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
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

      mockSymbolManager.tvToInvesting.mockReturnValue('RELIANCE');
      mockSymbolManager.investingToTv.mockReturnValue('NSE:RELIANCE');
      mockWatchManager.isWatched.mockReturnValue(false);
      mockRecentManager.isRecent.mockReturnValue(false);

      await expect(alertFeedManager.createAlertFeedEvent('NSE:RELIANCE')).rejects.toThrow('Storage failed');
    });

    it('should handle null/undefined ticker inputs', () => {
      mockSymbolManager.investingToTv.mockReturnValue(null);

      const result = alertFeedManager.getAlertFeedState('');

      expect(result.state).toBe(FeedState.UNMAPPED);
      expect(result.color).toBe('red');
    });
  });
});
