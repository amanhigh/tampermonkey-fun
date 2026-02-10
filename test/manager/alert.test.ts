import { AlertManager, IAlertManager } from '../../src/manager/alert';
import { IInvestingClient } from '../../src/client/investing';
import { Alert, PairInfo } from '../../src/models/alert';
import { IAlertRepo } from '../../src/repo/alert';
import { AlertClicked, AlertClickAction } from '../../src/models/events';
import { IPairManager } from '../../src/manager/pair';
import { ITickerManager } from '../../src/manager/ticker';
import { ITradingViewManager } from '../../src/manager/tv';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
    red: jest.fn(),
  },
}));

// Mock jQuery globally for HTML parsing tests
(global as any).$ = jest.fn(() => ({
  find: jest.fn().mockReturnThis(),
  each: jest.fn(),
  attr: jest.fn(),
  length: 0,
})) as any;

describe('AlertManager', () => {
  let alertManager: IAlertManager;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;
  let mockPairManager: jest.Mocked<IPairManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockInvestingClient: jest.Mocked<IInvestingClient>;
  let mockTradingViewManager: jest.Mocked<ITradingViewManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AlertRepo
    mockAlertRepo = {
      addAlert: jest.fn(),
      getSortedAlerts: jest.fn(),
      removeAlert: jest.fn(),
      hasAlerts: jest.fn(),
      getAlertCount: jest.fn(),
      createAlertClickEvent: jest.fn(),
      getAllKeys: jest.fn().mockReturnValue([]),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IAlertRepo>;

    // Mock PairManager
    mockPairManager = {
      getAllInvestingTickers: jest.fn(),
      createInvestingToPairMapping: jest.fn(),
      investingTickerToPairInfo: jest.fn(),
      stopTrackingByInvestingTicker: jest.fn(),
      stopTrackingByTvTicker: jest.fn(),
    };

    // Mock TickerManager
    mockTickerManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      getSelectedTickers: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    };

    // Mock InvestingClient
    mockInvestingClient = {
      createAlert: jest.fn(),
      deleteAlert: jest.fn(),
      fetchSymbolData: jest.fn(),
      getAllAlerts: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue('https://in.investing.com'),
    };

    // Mock TradingViewManager
    mockTradingViewManager = {
      getName: jest.fn(),
      getLastTradedPrice: jest.fn(),
      getCursorPrice: jest.fn(),
      clipboardCopy: jest.fn(),
      toggleFlag: jest.fn(),
      closeTextBox: jest.fn(),
      isSwiftKeysEnabled: jest.fn(),
      setSwiftKeysState: jest.fn(),
      startAutoSave: jest.fn(),
    };

    alertManager = new AlertManager(
      mockAlertRepo,
      mockPairManager,
      mockTickerManager,
      mockInvestingClient,
      mockTradingViewManager
    );
  });

  describe('getAlerts', () => {
    it('should return alerts for current ticker', () => {
      const testAlerts = [new Alert('1', '123', 100), new Alert('2', '123', 200)];
      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC'));
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);

      const result = alertManager.getAlerts();

      expect(mockTickerManager.getInvestingTicker).toHaveBeenCalled();
      expect(mockPairManager.investingTickerToPairInfo).toHaveBeenCalledWith('HDFC');
      expect(mockAlertRepo.getSortedAlerts).toHaveBeenCalledWith('123');
      expect(result).toEqual(testAlerts);
    });

    it('should return null when pair info not found', () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('UNKNOWN');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      const result = alertManager.getAlerts();

      expect(result).toBeNull();
    });
  });

  describe('getAlertsForInvestingTicker', () => {
    it('should return alerts for valid investing ticker', () => {
      const testAlerts = [new Alert('1', '123', 100)];
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);

      const result = alertManager.getAlertsForInvestingTicker('HDFC');

      expect(mockPairManager.investingTickerToPairInfo).toHaveBeenCalledWith('HDFC');
      expect(mockAlertRepo.getSortedAlerts).toHaveBeenCalledWith('123');
      expect(result).toEqual(testAlerts);
    });

    it('should return null for unknown investing ticker', () => {
      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      const result = alertManager.getAlertsForInvestingTicker('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('createAlertForCurrentTicker', () => {
    it('should create alert successfully', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      const mockResponse = { name: 'HDFC Bank', pairId: '123', price: 1500 };

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockTradingViewManager.getLastTradedPrice.mockReturnValue(1450);
      mockInvestingClient.createAlert.mockResolvedValue(mockResponse);

      const result = await alertManager.createAlertForCurrentTicker(1500);

      expect(mockInvestingClient.createAlert).toHaveBeenCalledWith('HDFC Bank', '123', 1500, 1450);
      expect(mockAlertRepo.addAlert).toHaveBeenCalledWith('123', expect.any(Alert));
      expect(result).toEqual(pairInfo);
    });

    it('should throw error when pair info not found', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('UNKNOWN');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      await expect(alertManager.createAlertForCurrentTicker(1500)).rejects.toThrow(
        'No pair info found for ticker: UNKNOWN'
      );
    });

    it('should throw error when API call fails', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockTradingViewManager.getLastTradedPrice.mockReturnValue(1450);
      mockInvestingClient.createAlert.mockRejectedValue(new Error('API Error'));

      await expect(alertManager.createAlertForCurrentTicker(1500)).rejects.toThrow(
        'Failed to create alert for HDFC at price 1500'
      );
    });
  });

  describe('deleteAlert', () => {
    it('should delete specific alert successfully', async () => {
      const alert = new Alert('1', '123', 1500);
      mockInvestingClient.deleteAlert.mockResolvedValue();

      await alertManager.deleteAlert(alert);

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(alert);
      expect(mockAlertRepo.removeAlert).toHaveBeenCalledWith('123', '1');
    });

    it('should handle API failure during deletion', async () => {
      const alert = new Alert('1', '123', 1500);
      mockInvestingClient.deleteAlert.mockRejectedValue(new Error('API Error'));

      await expect(alertManager.deleteAlert(alert)).rejects.toThrow('Failed to delete alert 1: API Error');
      expect(mockAlertRepo.removeAlert).not.toHaveBeenCalled();
    });

    it('should handle unknown error types', async () => {
      const alert = new Alert('1', '123', 1500);
      mockInvestingClient.deleteAlert.mockRejectedValue('String error');

      await expect(alertManager.deleteAlert(alert)).rejects.toThrow('Failed to delete alert 1: Unknown error');
    });
  });

  describe('createAlertClickEvent', () => {
    it('should create alert click event successfully', async () => {
      const investingTicker = 'HDFC';
      const action = AlertClickAction.OPEN;

      await alertManager.createAlertClickEvent(investingTicker, action);

      expect(mockAlertRepo.createAlertClickEvent).toHaveBeenCalledWith(expect.any(AlertClicked));

      const eventArg = (mockAlertRepo.createAlertClickEvent as jest.Mock).mock.calls[0][0];
      expect(eventArg.investingTicker).toBe(investingTicker);
      expect(eventArg.action).toBe(action);
    });

    it('should handle repository failure during event creation', async () => {
      mockAlertRepo.createAlertClickEvent.mockRejectedValue(new Error('Repo error'));

      await expect(alertManager.createAlertClickEvent('HDFC', AlertClickAction.MAP)).rejects.toThrow('Repo error');
    });
  });

  describe('deleteAllAlerts', () => {
    it('should delete all alerts for current ticker', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      const testAlerts = [new Alert('1', '123', 100), new Alert('2', '123', 200)];

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);
      mockInvestingClient.deleteAlert.mockResolvedValue();

      await alertManager.deleteAllAlerts();

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[0]);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[1]);
      expect(mockAlertRepo.removeAlert).toHaveBeenCalledTimes(2);
    });

    it('should warn when no alerts found to delete', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(null as any);

      await alertManager.deleteAllAlerts();

      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
      // Notifier.warn is already mocked in the setup
    });

    it('should throw error when pair info not found', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('UNKNOWN');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      await expect(alertManager.deleteAllAlerts()).rejects.toThrow('No Pair Info found for UNKNOWN');
    });
  });

  describe('deleteAlertsByPrice', () => {
    it('should delete alerts within price tolerance', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      const testAlerts = [
        new Alert('1', '123', 100), // Within tolerance (3% of 100 = 3, so 97-103)
        new Alert('2', '123', 102), // Within tolerance
        new Alert('3', '123', 150), // Outside tolerance
      ];

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);
      mockInvestingClient.deleteAlert.mockResolvedValue();

      await alertManager.deleteAlertsByPrice(100);

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[0]);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[1]);
      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalledWith(testAlerts[2]);
    });

    it('should warn when no alerts found to delete', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(null as any);

      await alertManager.deleteAlertsByPrice(100);

      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
    });

    it('should warn when no alerts within price tolerance', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      const testAlerts = [
        new Alert('1', '123', 50), // Outside tolerance (target 100, tolerance 3, so 97-103)
        new Alert('2', '123', 200), // Outside tolerance
      ];

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);

      await alertManager.deleteAlertsByPrice(100);

      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
    });

    it('should calculate tolerance correctly for different prices', async () => {
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      const testAlerts = [
        new Alert('1', '123', 1000), // Target 1000, tolerance 30, so 970-1030
        new Alert('2', '123', 1025), // Within tolerance
        new Alert('3', '123', 1040), // Outside tolerance
      ];

      mockTickerManager.getInvestingTicker.mockReturnValue('HDFC');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.getSortedAlerts.mockReturnValue(testAlerts);
      mockInvestingClient.deleteAlert.mockResolvedValue();

      await alertManager.deleteAlertsByPrice(1000);

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[0]);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(testAlerts[1]);
      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalledWith(testAlerts[2]);
    });
  });

  describe('reloadAlerts with HTML parsing', () => {
    it('should clear alerts before reloading', async () => {
      const mockHtml = '<div></div>';
      mockInvestingClient.getAllAlerts.mockResolvedValue(mockHtml);

      // Mock empty jQuery result
      ((global as any).$ as jest.Mock).mockReturnValue({
        find: jest.fn().mockReturnValue({
          each: jest.fn(),
        }),
      });

      const count = await alertManager.reloadAlerts();

      expect(mockAlertRepo.clear).toHaveBeenCalled();
      expect(mockInvestingClient.getAllAlerts).toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('should parse valid alert items from HTML', async () => {
      const mockHtml =
        '<div class="js-alert-item" data-trigger="price" data-pair-id="123" data-value="100.50" data-alert-id="alert1"></div>';
      mockInvestingClient.getAllAlerts.mockResolvedValue(mockHtml);

      // Mock jQuery to simulate finding alert elements
      const mockAlertElement = {
        attr: jest.fn((attr: string) => {
          switch (attr) {
            case 'data-pair-id':
              return '123';
            case 'data-value':
              return '100.50';
            case 'data-alert-id':
              return 'alert1';
            default:
              return '';
          }
        }),
      };

      // Mock the jQuery chain properly - $(html).find().each()
      ((global as any).$ as jest.Mock).mockImplementation((input) => {
        if (typeof input === 'string' && input.includes('alert-item')) {
          return {
            find: jest.fn().mockReturnValue({
              each: jest.fn((callback) => {
                callback(0, mockAlertElement);
              }),
            }),
          };
        }
        // For $(alertElement) calls inside the each callback
        return mockAlertElement;
      });

      const count = await alertManager.reloadAlerts();

      expect(mockAlertRepo.clear).toHaveBeenCalled();
      expect(mockAlertRepo.addAlert).toHaveBeenCalledWith('123', expect.any(Alert));
      expect(count).toBe(1);
    });

    it('should warn about invalid alert items', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockHtml = '<div class="js-alert-item" data-trigger="price"></div>';
      mockInvestingClient.getAllAlerts.mockResolvedValue(mockHtml);

      // Mock jQuery to simulate finding invalid alert elements
      const mockInvalidElement = {
        attr: jest.fn(() => ''), // Return empty strings for all attributes
      };

      ((global as any).$ as jest.Mock).mockImplementation((input) => {
        if (typeof input === 'string') {
          return {
            find: jest.fn().mockReturnValue({
              each: jest.fn((callback) => {
                callback(0, mockInvalidElement);
              }),
            }),
          };
        }
        return mockInvalidElement;
      });

      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      const count = await alertManager.reloadAlerts();

      expect(consoleSpy).toHaveBeenCalledWith('Invalid alert:', undefined, expect.any(Alert));
      expect(mockAlertRepo.addAlert).not.toHaveBeenCalled();
      expect(count).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should handle alerts with zero price', async () => {
      const mockHtml =
        '<div class="js-alert-item" data-trigger="price" data-pair-id="123" data-value="0" data-alert-id="alert1"></div>';
      mockInvestingClient.getAllAlerts.mockResolvedValue(mockHtml);

      const mockZeroPriceElement = {
        attr: jest.fn((attr: string) => {
          switch (attr) {
            case 'data-pair-id':
              return '123';
            case 'data-value':
              return '0';
            case 'data-alert-id':
              return 'alert1';
            default:
              return '';
          }
        }),
      };

      ((global as any).$ as jest.Mock).mockImplementation((input) => {
        if (typeof input === 'string') {
          return {
            find: jest.fn().mockReturnValue({
              each: jest.fn((callback) => {
                callback(0, mockZeroPriceElement);
              }),
            }),
          };
        }
        return mockZeroPriceElement;
      });

      const count = await alertManager.reloadAlerts();

      expect(mockAlertRepo.addAlert).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });

    it('should handle alerts with invalid price', async () => {
      const mockHtml =
        '<div class="js-alert-item" data-trigger="price" data-pair-id="123" data-value="invalid" data-alert-id="alert1"></div>';
      mockInvestingClient.getAllAlerts.mockResolvedValue(mockHtml);

      const mockInvalidPriceElement = {
        attr: jest.fn((attr: string) => {
          switch (attr) {
            case 'data-pair-id':
              return '123';
            case 'data-value':
              return 'invalid';
            case 'data-alert-id':
              return 'alert1';
            default:
              return '';
          }
        }),
      };

      ((global as any).$ as jest.Mock).mockImplementation((input) => {
        if (typeof input === 'string') {
          return {
            find: jest.fn().mockReturnValue({
              each: jest.fn((callback) => {
                callback(0, mockInvalidPriceElement);
              }),
            }),
          };
        }
        return mockInvalidPriceElement;
      });

      const count = await alertManager.reloadAlerts();

      expect(mockAlertRepo.addAlert).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });
});
