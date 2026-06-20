import { AlertHandler, IAlertHandler } from '../../src/handler/alert';
import { IAlertManager } from '../../src/manager/alert';
import { ITradingViewManager } from '../../src/manager/tv';
import { IDomManager } from '../../src/manager/dom';
import { ITickerManager } from '../../src/manager/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IUIUtil } from '../../src/util/ui';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { ApiError, wrapClientError } from '../../src/models/api_error';
import { AlertClicked, AlertClickAction } from '../../src/models/events';
import { AlertTicker } from '../../src/models/alert_ticker';

jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

describe('AlertHandler', () => {
  let handler: IAlertHandler;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockTradingViewManager: jest.Mocked<ITradingViewManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockAlertTickerHandler: jest.Mocked<IAlertTickerHandler>;
  const { Notifier } = jest.requireMock('../../src/util/notify');

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlertManager = {
      getAlerts: jest.fn(),
      getAlertsForTicker: jest.fn(),
      createAlertForCurrentTicker: jest.fn(),
      deleteAllAlerts: jest.fn(),
      deleteAlertsByPrice: jest.fn(),
      deleteAlert: jest.fn(),
      refreshAlerts: jest.fn(),
      createAlertClickEvent: jest.fn(),
    } as any;

    mockTradingViewManager = {
      getLastTradedPrice: jest.fn(),
      getCursorPrice: jest.fn(),
    } as any;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TV:INFY'),
      getCurrentExchange: jest.fn().mockReturnValue('NSE'),
    } as any;

    mockTickerManager = {} as any;

    mockAlertTickerManager = {
      linkAlertTicker: jest.fn().mockResolvedValue({} as any),
      fetchAlertTicker: jest.fn(),
      getPrimaryAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
      deleteAlertTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockUIUtil = {
      showConfirm: jest.fn(),
    } as any;
    mockTickerHandler = {
      openTicker: jest.fn(),
    } as any;
    mockAlertTickerHandler = {
      linkInvestingTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new AlertHandler(
      mockAlertManager,
      mockTradingViewManager,
      mockDomManager,
      mockTickerManager,
      mockAlertTickerManager,
      mockUIUtil,
      mockTickerHandler,
      mockAlertTickerHandler
    );
  });

  describe('handleAlertClick', () => {
    describe('OPEN action', () => {
      it('should open ticker via tickerHandler when alert ticker is not found', () => {
        const event = new AlertClicked('INFY', AlertClickAction.OPEN);
        mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);

        handler.handleAlertClick(event);

        expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      });

      it('should open mapped TV ticker when alert ticker exists', () => {
        const event = new AlertClicked('INFY', AlertClickAction.OPEN);
        const alertTicker: AlertTicker = {
          symbol: 'INFY',
          pair_id: '123',
          name: 'Infosys Ltd',
          exchange: 'NSE',
          type: 'PRIMARY',
          ticker: 'TV:INFY',
          created_at: '',
          updated_at: '',
        };
        mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(alertTicker);

        handler.handleAlertClick(event);

        expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      });
    });

    describe('MAP action', () => {
      it('should warn and return when pairId is missing', () => {
        const event = new AlertClicked('INFY', AlertClickAction.MAP);

        handler.handleAlertClick(event);

        expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('no pairId'));
        expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
      });

      it('should create link when no alert ticker exists and pairId is present', async () => {
        mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

        const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
        handler.handleAlertClick(event);

        // Wait for promises
        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TV:INFY');
        expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV:INFY', {
          symbol: 'INFY',
          pair_id: '12345',
          name: 'INFY',
          exchange: 'NSE',
        });
        expect(Notifier.success).toHaveBeenCalledWith(expect.stringContaining('Mapped'));
      });

      it('should create link when existing alert ticker has different symbol', async () => {
        const existing: AlertTicker = {
          symbol: 'SBIN',
          pair_id: '678',
          name: 'State Bank',
          exchange: 'NSE',
          type: 'PRIMARY',
          ticker: 'TV:INFY',
          created_at: '',
          updated_at: '',
        };
        mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([existing]);

        const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
        handler.handleAlertClick(event);

        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV:INFY', {
          symbol: 'INFY',
          pair_id: '12345',
          name: 'INFY',
          exchange: 'NSE',
        });
      });

      it('should skip duplicate linking when any alert ticker symbol matches and not call display', async () => {
        const existing: AlertTicker = {
          symbol: 'INFY',
          pair_id: '12345',
          name: 'Infosys Ltd',
          exchange: 'NSE',
          type: 'PRIMARY',
          ticker: 'TV:INFY',
          created_at: '',
          updated_at: '',
        };
        mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([existing]);

        const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
        handler.handleAlertClick(event);

        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
        expect(Notifier.info).toHaveBeenCalledWith(expect.stringContaining('Already mapped'));
      });

      it('should store alertName as name when provided', async () => {
        mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

        const event = new AlertClicked('SSEC', AlertClickAction.MAP, '40820', 'Shanghai Composite');
        handler.handleAlertClick(event);

        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV:INFY', {
          symbol: 'SSEC',
          pair_id: '40820',
          name: 'Shanghai Composite',
          exchange: 'NSE',
        });
        expect(Notifier.success).toHaveBeenCalledWith(expect.stringContaining('Mapped'));
      });

      it('should fallback to alertTicker when alertName is not provided', async () => {
        mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

        const event = new AlertClicked('SSEC', AlertClickAction.MAP, '40820');
        handler.handleAlertClick(event);

        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV:INFY', {
          symbol: 'SSEC',
          pair_id: '40820',
          name: 'SSEC',
          exchange: 'NSE',
        });
      });

      it('should warn and skip mapping when parent TV ticker is not tracked', async () => {
        const apiErr = new ApiError(404, 'Ticker not found');
        const wrapped = wrapClientError(apiErr, 'Failed to list all Alert tickers');
        mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(wrapped);

        const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
        handler.handleAlertClick(event);

        await new Promise(process.nextTick);

        expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TV:INFY');
        expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
        expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('Start tracking'));
      });
    });
  });

  describe('handleAlertButton', () => {
    it('creates alert 20% above current price on normal click (no Ctrl)', async () => {
      mockTradingViewManager.getLastTradedPrice.mockReturnValue(100);
      mockAlertManager.createAlertForCurrentTicker = jest.fn().mockResolvedValue({ name: 'INFY' });

      handler.handleAlertButton({ ctrlKey: false } as MouseEvent);

      // Wait for async createHighAlert → createAlertAndNotify → createAlertForCurrentTicker
      await new Promise(process.nextTick);

      expect(mockTradingViewManager.getLastTradedPrice).toHaveBeenCalled();
      expect(mockAlertManager.createAlertForCurrentTicker).toHaveBeenCalled();
      // Price should be 120 (100 * 1.2)
      const priceArg = (mockAlertManager.createAlertForCurrentTicker as jest.Mock).mock.calls[0][0];
      expect(priceArg).toBe(120);
    });

    it('maps current exchange to ticker when Ctrl is pressed', async () => {
      mockTickerManager.setExchange = jest.fn().mockResolvedValue(undefined);

      handler.handleAlertButton({ ctrlKey: true } as MouseEvent);

      await new Promise(process.nextTick);

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockDomManager.getCurrentExchange).toHaveBeenCalled();
      expect(mockTickerManager.setExchange).toHaveBeenCalledWith('TV:INFY', 'NSE');
    });
  });

  describe('alert ticker delink', () => {
    let capturedHandler: Function;
    let mockRowJQ: { attr: jest.Mock };

    beforeEach(() => {
      capturedHandler = {} as any;

      mockRowJQ = {
        attr: jest.fn((key: string) => {
          if (key === 'data-alert-ticker-symbol') return 'INFY.PA';
          if (key === 'data-alert-ticker-type') return 'SECONDARY';
          return '';
        }),
      };

      const mockCardJQ = {
        on: jest.fn((_event: string, _selector: string, handler: any) => {
          capturedHandler = handler;
        }),
      };

      (global as any).$ = jest.fn((arg: any) => {
        if (arg === '#aman-display') return mockCardJQ;
        // Return mockRowJQ when called with e.currentTarget (object, not string)
        if (typeof arg !== 'string') {
          return arg && (arg as any).attr ? arg : { on: jest.fn() };
        }
        return { on: jest.fn() };
      });
    });

    it('registers delegated contextmenu handler on display card', () => {
      handler.registerAlertTickerDelinkHandler();
      expect(typeof capturedHandler).toBe('function');
    });

    it('deletes SECONDARY after confirm', async () => {
      handler.registerAlertTickerDelinkHandler();
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: mockRowJQ,
      };
      await capturedHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith('Delink INFY.PA?');
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY.PA');
      expect(Notifier.success).toHaveBeenCalledWith('⏹ Delinked INFY.PA');
    });

    it('uses stronger confirm text for PRIMARY', async () => {
      mockRowJQ.attr.mockImplementation((key: string) => {
        if (key === 'data-alert-ticker-symbol') return 'INFY';
        if (key === 'data-alert-ticker-type') return 'PRIMARY';
        return '';
      });

      handler.registerAlertTickerDelinkHandler();
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: mockRowJQ,
      };
      await capturedHandler(mockEvent);

      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith(
        expect.stringContaining('PRIMARY')
      );
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY');
    });

    it('does not delete when confirm is cancelled', async () => {
      handler.registerAlertTickerDelinkHandler();
      mockUIUtil.showConfirm.mockReturnValue(false);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: mockRowJQ,
      };
      await capturedHandler(mockEvent);

      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
    });

    it('warns when delete fails', async () => {
      mockAlertTickerManager.deleteAlertTicker.mockRejectedValue(new Error('Not found'));
      handler.registerAlertTickerDelinkHandler();
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: mockRowJQ,
      };
      await capturedHandler(mockEvent);

      expect(Notifier.warn).toHaveBeenCalledWith('Failed to delink INFY.PA: Not found');
    });
  });
});
