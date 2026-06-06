import { IInvestingClient } from '../../src/client/investing';
import { IPriceAlertClient } from '../../src/client/price_alert';
import { Alert, PairInfo } from '../../src/models/alert';
import { AlertTicker } from '../../src/models/alert_ticker';
import { AlertClickAction } from '../../src/models/events';
import { AlertManager, IAlertManager } from '../../src/manager/alert';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IDomManager } from '../../src/manager/dom';
import { ITradingViewManager } from '../../src/manager/tv';
import { Constants } from '../../src/models/constant';

jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
  },
}));

describe('AlertManager', () => {
  let alertManager: IAlertManager;
  let mockPriceAlertClient: jest.Mocked<IPriceAlertClient>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
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

    mockPriceAlertClient = {
      getBaseUrl: jest.fn(),
      replacePriceAlerts: jest.fn(),
      createPendingPriceAlert: jest.fn(),
      deletePriceAlert: jest.fn(),
      listPriceAlerts: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      linkAlertTicker: jest.fn(),
      getAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as any;

    mockDomManager = {
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
      mockPriceAlertClient,
      mockAlertTickerManager,
      mockDomManager,
      mockInvestingClient,
      mockTradingViewManager
    );
  });

  describe('getAlerts', () => {
    it('should list backend alerts for current TV ticker', async () => {
      mockDomManager.getTicker.mockReturnValue('TV:HDFC');
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue([
        { alert_id: '1', pair_id: '123', trigger_price: 100, created_at: '' },
        { alert_id: '2', pair_id: '123', trigger_price: 200, created_at: '' },
      ]);

      const result = await alertManager.getAlerts();

      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'TV:HDFC',
        'sort-by': 'trigger_price',
        'sort-order': 'asc',
      });
      expect(result).toEqual([new Alert('1', '123', 100), new Alert('2', '123', 200)]);
    });
  });

  describe('getAlertsForTicker', () => {
    it('should list backend alerts for the provided TV ticker', async () => {
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue([
        { alert_id: '1', pair_id: '123', trigger_price: 100, created_at: '' },
      ]);

      const result = await alertManager.getAlertsForTicker('TV:HDFC');

      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'TV:HDFC',
        'sort-by': 'trigger_price',
        'sort-order': 'asc',
      });
      expect(result).toEqual([new Alert('1', '123', 100)]);
    });
  });

  describe('createAlertForCurrentTicker', () => {
    it('should create Investing alert and backend pending price alert', async () => {
      mockDomManager.getTicker.mockReturnValue('TV:HDFC');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(defaultAlertTicker);
      mockTradingViewManager.getLastTradedPrice.mockReturnValue(500);
      mockInvestingClient.createAlert.mockResolvedValue({ name: 'HDFC', pairId: '123', price: 550 });
      mockPriceAlertClient.createPendingPriceAlert.mockResolvedValue({
        pair_id: '123',
        trigger_price: 550,
        created_at: '',
      });

      const result = await alertManager.createAlertForCurrentTicker(550);

      expect(mockAlertTickerManager.getAlertTicker).toHaveBeenCalledWith('TV:HDFC');
      expect(mockInvestingClient.createAlert).toHaveBeenCalledWith('HDFC Bank', '123', 550, 500);
      expect(mockPriceAlertClient.createPendingPriceAlert).toHaveBeenCalledWith('TV:HDFC', { trigger_price: 550 });
      expect(result).toBeInstanceOf(PairInfo);
      expect(result.name).toBe('HDFC Bank');
    });

    it('should throw error when no alert ticker found', async () => {
      mockDomManager.getTicker.mockReturnValue('TV:UNKNOWN');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(null);

      await expect(alertManager.createAlertForCurrentTicker(550)).rejects.toThrow('No alert ticker found');
    });
  });

  describe('deleteAlert', () => {
    it('should delete alert by id from Investing and backend', async () => {
      mockInvestingClient.deleteAlert.mockResolvedValue(undefined);
      mockPriceAlertClient.deletePriceAlert.mockResolvedValue(undefined);

      await alertManager.deleteAlert('1');

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(new Alert('1', '', 0));
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledWith('1');
    });

    it('should throw error when deletion fails', async () => {
      mockInvestingClient.deleteAlert.mockRejectedValue(new Error('API error'));

      await expect(alertManager.deleteAlert('1')).rejects.toThrow('Failed to delete alert 1: API error');
    });
  });

  describe('deleteAllAlerts', () => {
    it('should delete all resolved alerts for current ticker', async () => {
      mockDomManager.getTicker.mockReturnValue('TV:HDFC');
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue([
        { alert_id: '1', pair_id: '123', trigger_price: 100, created_at: '' },
        { alert_id: '2', pair_id: '123', trigger_price: 200, created_at: '' },
      ]);
      mockInvestingClient.deleteAlert.mockResolvedValue(undefined);
      mockPriceAlertClient.deletePriceAlert.mockResolvedValue(undefined);

      await alertManager.deleteAllAlerts();

      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshAlerts', () => {
    it('should parse Investing HTML and replace backend price alerts', async () => {
      mockInvestingClient.getAllAlerts.mockResolvedValue(
        '<div class="js-alert-item" data-trigger="price" data-pair-id="123" data-alert-id="1" data-value="100.5"></div>'
      );
      mockPriceAlertClient.replacePriceAlerts.mockResolvedValue({ pairs_replaced: 1, alerts_created: 1 });
      (global as any).$ = jest.fn((input: unknown) => {
        if (typeof input === 'string') {
          return {
            find: jest.fn().mockReturnValue({
              each: (callback: (_: number, element: unknown) => void) => {
                callback(0, {});
              },
            }),
          };
        }
        return {
          attr: jest.fn((attribute: string) => {
            const attrs: Record<string, string> = {
              'data-pair-id': '123',
              'data-value': '100.5',
              'data-alert-id': '1',
            };
            return attrs[attribute];
          }),
        };
      });

      const count = await alertManager.refreshAlerts();

      expect(mockPriceAlertClient.replacePriceAlerts).toHaveBeenCalledWith({
        alerts: [{ pair_id: '123', alert_id: '1', trigger_price: 100.5 }],
      });
      expect(count).toBe(1);
    });
  });

  describe('createAlertClickEvent', () => {
    it('should publish alert click event through GM storage', async () => {
      (global as any).GM = { setValue: jest.fn().mockResolvedValue(undefined) };

      await alertManager.createAlertClickEvent('HDFC', AlertClickAction.OPEN);

      expect((global as any).GM.setValue).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.ALERT_CLICKED,
        expect.stringContaining('HDFC')
      );
    });
  });
});
