import { DashboardSyncManager, IDashboardSyncManager } from '../../src/manager/dashboard_sync';
import { DashboardTickerChangedEvent } from '../../src/models/events';
import { Constants } from '../../src/models/constant';

// Mock GM
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

describe('DashboardSyncManager', () => {
  let manager: IDashboardSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new DashboardSyncManager();
  });

  describe('publishTickerChanged', () => {
    it('should publish ticker changed event via GM.setValue', async () => {
      await manager.publishTickerChanged('RELIANCE');

      expect(GM.setValue).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.TICKER_CHANGED,
        expect.any(String)
      );

      const storedArg = (GM.setValue as jest.Mock).mock.calls[0][1] as string;
      const parsed = DashboardTickerChangedEvent.fromString(storedArg);
      expect(parsed.ticker).toBe('RELIANCE');
    });
  });
});
