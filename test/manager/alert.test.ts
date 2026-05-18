import { AlertManager, IAlertManager } from '../../src/manager/alert';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ITickerManager } from '../../src/manager/ticker';
import { ITradingViewManager } from '../../src/manager/tv';
import { IInvestingClient } from '../../src/client/investing';
import { IAlertRepo } from '../../src/repo/alert';
import { Alert, PairInfo } from '../../src/models/alert';
import { AlertTicker } from '../../src/models/alert_ticker';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
  },
}));

// Mock jQuery
(global as any).$ = jest.fn(() => ({
  find: jest.fn().mockReturnThis(),
  each: jest.fn(),
}));

describe('AlertManager', () => {
  let alertManager: IAlertManager;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockInvestingClient: jest.Mocked<IInvestingClient>;
  let mockTradingViewManager: jest.Mocked<ITradingViewManager>;

  const defaultAlertTicker: AlertTicker = {
    symbol: 'HDFC',
    pair_id: '123',
    name: 'HDFC Bank',
    exchange: 'NSE',
    ticker: 'TV:HDFC',
    created_at: '',
    updated_at: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlertRepo = {
      get: jest.fn(),
      getSortedAlerts: jest.fn(),
      addAlert: jest.fn(),
      removeAlert: jest.fn(),
      delete: jest.fn(),
      getAllKeys: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      set: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      createAlertClickEvent: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getAlertTickers: jest.fn(),
      createAlertTicker: jest.fn(),
    } as any;

    mockTickerManager = {
      getInvestingTicker: jest.fn(),
      getTicker: jest.fn(),
    } as any;

    mockInvestingClient = {
      createAlert: jest.fn(),
      deleteAlert: jest.fn(),
      fetchSymbolData: jest.fn(),
      getAllAlerts: jest.fn(),
    } as any;

    mockTradingViewManager = {
      getLastTradedPrice: jest.fn(),
    } as any;

    alertManager = new AlertManager(
      mockAlertRepo,
      mockAlertTickerManager,
      mockTickerManager,
      mockInvestingClient,
      mockTradingViewManager
    );
  });

  describe('getAlerts', () => {
    it('should get alerts for current investing ticker', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockTickerManager.getTicker.mockReturnValue('TV:HDFC');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([defaultAlertTicker]);
      mockAlertRepo.getSortedAlerts.mockReturnValue([
        new Alert('1', '123', 100),
        new Alert('2', '123', 200),
      ]);

      const result = await alertManager.getAlerts();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledWith('TV:HDFC');
      expect(result).toHaveLength(2);
    });

    it('should return null when no alert ticker exists', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('UNKNOWN');
      mockTickerManager.getTicker.mockReturnValue('TV:UNKNOWN');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([]);

      const result = await alertManager.getAlerts();

      expect(result).toBeNull();
    });
  });

  describe('createAlertForCurrentTicker', () => {
    it('should create alert via Investing.com when alert ticker exists', async () => {
      mockTickerManager.getTicker.mockReturnValue('TV:HDFC');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([defaultAlertTicker]);
      mockTradingViewManager.getLastTradedPrice.mockReturnValue(500);
      mockInvestingClient.createAlert.mockResolvedValue({ name: 'HDFC', pairId: '123', price: 550 });

      const result = await alertManager.createAlertForCurrentTicker(550);

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledWith('TV:HDFC');
      expect(mockInvestingClient.createAlert).toHaveBeenCalledWith('HDFC Bank', '123', 550, 500);
      expect(mockAlertRepo.addAlert).toHaveBeenCalledWith('123', new Alert('', '123', 550));
      expect(result).toBeInstanceOf(PairInfo);
      expect(result.name).toBe('HDFC Bank');
    });

    it('should throw error when no alert ticker found', async () => {
      mockTickerManager.getTicker.mockReturnValue('TV:UNKNOWN');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([]);

      await expect(alertManager.createAlertForCurrentTicker(550)).rejects.toThrow('No alert ticker found');
    });
  });

  describe('deleteAlert', () => {
    it('should delete alert and remove from repo', async () => {
      const alert = new Alert('1', '123', 100);
      mockInvestingClient.deleteAlert.mockResolvedValue(undefined);
      mockAlertRepo.removeAlert.mockImplementation(() => {});

      await alertManager.deleteAlert(alert);

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(alert);
      expect(mockAlertRepo.removeAlert).toHaveBeenCalledWith('123', '1');
    });

    it('should throw error when deletion fails', async () => {
      const alert = new Alert('1', '123', 100);
      mockInvestingClient.deleteAlert.mockRejectedValue(new Error('API error'));

      await expect(alertManager.deleteAlert(alert)).rejects.toThrow('Failed to delete alert 1: API error');
    });
  });

  describe('deleteAllAlerts', () => {
    it('should delete all alerts for current ticker', async () => {
      const alerts = [new Alert('1', '123', 100), new Alert('2', '123', 200)];
      mockTickerManager.getTicker.mockReturnValue('TV:HDFC');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([defaultAlertTicker]);
      mockAlertRepo.getSortedAlerts.mockReturnValue(alerts);
      mockInvestingClient.deleteAlert.mockResolvedValue(undefined);

      await alertManager.deleteAllAlerts();

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockAlertRepo.removeAlert).toHaveBeenCalledTimes(2);
    });
  });
});
