import { AlertHandler, IAlertHandler } from '../../src/handler/alert';
import { IAlertManager } from '../../src/manager/alert';
import { ITradingViewManager } from '../../src/manager/tv';
import { IAuditHandler } from '../../src/handler/audit';
import { IDomManager } from '../../src/manager/dom';
import { ITickerManager } from '../../src/manager/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ISyncUtil } from '../../src/util/sync';
import { IUIUtil } from '../../src/util/ui';
import { IAlertSummaryHandler } from '../../src/handler/alert_summary';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
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
  let mockAuditHandler: jest.Mocked<IAuditHandler>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockAlertSummaryHandler: jest.Mocked<IAlertSummaryHandler>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockAlertTickerHandler: jest.Mocked<IAlertTickerHandler>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;
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

    mockAuditHandler = {
      auditAll: jest.fn(),
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
    } as any;

    mockSyncUtil = {
      waitOn: jest.fn(),
    } as any;
    mockUIUtil = {} as any;
    mockAlertSummaryHandler = {} as any;
    mockTickerHandler = {
      openTicker: jest.fn(),
    } as any;
    mockAlertTickerHandler = {
      linkInvestingTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockAlertFeedManager = {
      createAlertFeedEvent: jest.fn().mockResolvedValue(undefined),
      getAlertFeedState: jest.fn(),
      createResetFeedEvent: jest.fn(),
    } as any;

    handler = new AlertHandler(
      mockAlertManager,
      mockTradingViewManager,
      mockAuditHandler,
      mockDomManager,
      mockTickerManager,
      mockAlertTickerManager,
      mockSyncUtil,
      mockUIUtil,
      mockAlertSummaryHandler,
      mockTickerHandler,
      mockAlertTickerHandler,
      mockAlertFeedManager
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

      it('should skip duplicate linking when any alert ticker symbol matches', async () => {
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
    });
  });
});
