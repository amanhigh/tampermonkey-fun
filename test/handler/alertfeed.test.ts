import { AlertFeedHandler } from '../../src/handler/alertfeed';
import { IUIUtil } from '../../src/util/ui';
import { ISyncUtil } from '../../src/util/sync';
import { IAlertManager } from '../../src/manager/alert';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IInvestingManager } from '../../src/manager/investing';
import { AlertTicker } from '../../src/models/alert_ticker';
import { Instrument } from '../../src/models/investing';
import { AlertClickAction } from '../../src/models/events';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    yellow: jest.fn(),
    message: jest.fn(),
  },
}));

// Import Notifier after mock to get the mocked version
import { Notifier } from '../../src/util/notify';

describe('AlertFeedHandler', () => {
  let handler: AlertFeedHandler;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockInvestingManager: jest.Mocked<IInvestingManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global $ for DOM interaction
    const makeJQueryMock = (overrides: Record<string, any> = {}) => {
      const mock: any = {
        text: jest.fn().mockReturnValue(''),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue(null),
        }),
        attr: jest.fn().mockReturnValue(null),
        css: jest.fn().mockReturnThis(),
        appendTo: jest.fn().mockReturnThis(),
        ...overrides,
      };
      return mock;
    };
    (global as any).$ = jest.fn(() => makeJQueryMock());

    // Mock GM
    (global as any).GM = {
      setValue: jest.fn().mockResolvedValue(undefined),
      addValueChangeListener: jest.fn(),
    };

    mockUIUtil = {
      buildArea: jest.fn().mockReturnValue({ appendTo: jest.fn(), css: jest.fn() }),
      buildButton: jest.fn().mockReturnValue({ appendTo: jest.fn() }),
    } as any;

    mockSyncUtil = {} as any;

    mockAlertManager = {
      createAlertClickEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockAlertFeedManager = {
      getAlertFeedState: jest.fn(),
      createAlertFeedEvent: jest.fn(),
      createResetFeedEvent: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      fetchAlertTicker: jest.fn(),
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
    } as any;

    mockInvestingManager = {
      getInstrument: jest.fn(),
    } as any;

    handler = new AlertFeedHandler(
      mockUIUtil,
      mockSyncUtil,
      mockAlertManager,
      mockAlertFeedManager,
      mockAlertTickerManager,
      mockInvestingManager
    );
  });

  describe('handleAlertClick', () => {
    it('should resolve identity from existing AlertTicker and emit trusted fields', async () => {
      const alertTicker: AlertTicker = {
        symbol: 'INFY',
        pair_id: '12345',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        type: 'PRIMARY',
        ticker: 'TV:INFY',
        created_at: '',
        updated_at: '',
      };
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(alertTicker);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Infosys (INFY)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/equities/infosys'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: false, preventDefault: jest.fn() });

      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'INFY',
        AlertClickAction.OPEN,
        '12345',
        'Infosys Ltd'
      );
    });

    it('should fallback to instrument API and emit trusted fields with alertName', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 8874,
        url: '/equities/infosys',
        description: 'Infosys Ltd',
        symbol: 'INFY',
        exchange: 'NSE',
      };
      mockInvestingManager.getInstrument.mockResolvedValue(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Infosys (INFY)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('https://in.investing.com/equities/infosys'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      expect(mockInvestingManager.getInstrument).toHaveBeenCalledWith(
        'Infosys (INFY)',
        'https://in.investing.com/equities/infosys'
      );
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'INFY',
        AlertClickAction.MAP,
        '8874',
        'Infosys Ltd'
      );
    });

    it('should warn and skip event when both resolution paths fail', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      mockInvestingManager.getInstrument.mockResolvedValue(null);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Unknown (ZZZZZ)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/unknown'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: false, preventDefault: jest.fn() });

      expect(mockAlertManager.createAlertClickEvent).not.toHaveBeenCalled();
      expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('Cannot resolve alert identity'));
    });

    it('should use Ctrl key to determine MAP action', async () => {
      const alertTicker: AlertTicker = {
        symbol: 'TEST',
        pair_id: '999',
        name: 'Test Name',
        exchange: 'NSE',
        type: 'PRIMARY',
        ticker: 'TV:TEST',
        created_at: '',
        updated_at: '',
      };
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(alertTicker);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Test (TEST)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/test'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'TEST',
        AlertClickAction.MAP,
        '999',
        'Test Name'
      );
    });

    it('should publish instrument symbol (not raw HTML text) for name-only alerts', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 8874,
        url: '/indices/nq-100-futures',
        description: 'Nasdaq 100 Futures',
        symbol: 'NQ',
        exchange: 'CME',
      };
      mockInvestingManager.getInstrument.mockResolvedValue(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Nasdaq 100'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/indices/nq-100-futures'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      // alertTicker must be instrument.symbol ('NQ'), not the raw parsed text ('Nasdaq 100')
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'NQ',
        AlertClickAction.MAP,
        '8874',
        'Nasdaq 100 Futures'
      );
    });
  });
});
