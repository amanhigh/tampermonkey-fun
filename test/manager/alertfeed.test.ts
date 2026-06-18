import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IDisplayManager } from '../../src/manager/display';
import { DisplayState } from '../../src/models/display';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockDisplayManager: jest.Mocked<IDisplayManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDisplayManager = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<IDisplayManager>;

    alertFeedManager = new AlertFeedManager(mockDisplayManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('createAlertFeedEvent', () => {
    it('should resolve display info via DisplayManager and store event', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.DEFAULT, color: 'white' });

      await alertFeedManager.createAlertFeedEvent('INFY', 'TV:INFY');

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith('TV:INFY');
      expect(GM.setValue).toHaveBeenCalled();
    });

    it('should pass null ticker when ticker is omitted (unmapped)', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      await alertFeedManager.createAlertFeedEvent('UNKNOWN');

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
    });
  });

  describe('createResetFeedEvent', () => {
    it('should resolve DISPLAY state for null ticker and store reset event', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      await alertFeedManager.createResetFeedEvent();

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
      expect(GM.setValue).toHaveBeenCalled();
    });
  });
});
