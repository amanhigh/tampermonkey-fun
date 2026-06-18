import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IDisplayManager } from '../../src/manager/display';
import { FeedState } from '../../src/models/alertfeed';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockDisplayManager: jest.Mocked<IDisplayManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DisplayManager
    mockDisplayManager = {
      resolve: jest.fn(),
      resolveColor: jest.fn(),
      resolveHeaderColor: jest.fn(),
    } as unknown as jest.Mocked<IDisplayManager>;

    alertFeedManager = new AlertFeedManager(mockDisplayManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('getAlertFeedState', () => {
    it('should return UNMAPPED state when null is passed (delegates to DisplayManager)', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ color: 'red', feedState: FeedState.UNMAPPED });

      const result = await alertFeedManager.getAlertFeedState(null);

      expect(result).toEqual({ state: FeedState.UNMAPPED, color: 'red' });
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null, 'ALERT_FEED');
    });

    it('should delegate to DisplayManager for ticker state', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ color: 'yellow', feedState: FeedState.WATCHED });

      const result = await alertFeedManager.getAlertFeedState('NSE:RELIANCE');

      expect(result).toEqual({ state: FeedState.WATCHED, color: 'yellow' });
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith('NSE:RELIANCE', 'ALERT_FEED');
    });

    it('should return RECENT when DisplayManager resolves RECENT', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ color: 'lime', feedState: FeedState.RECENT });

      const result = await alertFeedManager.getAlertFeedState('NSE:TCS');

      expect(result).toEqual({ state: FeedState.RECENT, color: 'lime' });
    });

    it('should return MAPPED when DisplayManager resolves MAPPED', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ color: 'white', feedState: FeedState.MAPPED });

      const result = await alertFeedManager.getAlertFeedState('NSE:HDFC');

      expect(result).toEqual({ state: FeedState.MAPPED, color: 'white' });
    });
  });
});
