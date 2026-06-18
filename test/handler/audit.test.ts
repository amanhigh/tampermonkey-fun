import { AuditHandler } from '../../src/handler/audit';
import { AuditSectionRegistry } from '../../src/util/audit_registry';
import { IUIUtil } from '../../src/util/ui';
import { AlertState } from '../../src/models/alert';
import { Constants } from '../../src/models/constant';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { IDomManager } from '../../src/manager/dom';
import { DomainEventType } from '../../src/models/domain_event';
import { ISubscriber } from '../../src/manager/event_bus';

// Mock jQuery globally for DOM operations
const mockJQuery = {
  empty: jest.fn().mockReturnThis(),
  length: 1,
  remove: jest.fn().mockReturnThis(),
  replaceWith: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  prependTo: jest.fn().mockReturnThis(),
  css: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  click: jest.fn().mockReturnThis(),
  find: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  addClass: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  prop: jest.fn().mockReturnThis(),
  slideUp: jest.fn().mockReturnThis(),
  slideDown: jest.fn().mockReturnThis(),
} as any;

(global as any).$ = jest.fn(() => mockJQuery);

jest.mock('../../src/util/notify', () => ({
  Notifier: { red: jest.fn(), success: jest.fn(), info: jest.fn(), warn: jest.fn(), message: jest.fn() },
}));

function makeSection(overrides: Partial<any> = {}): any {
  return {
    id: 'test',
    title: 'Test',
    plugin: { run: jest.fn().mockResolvedValue([]) },
    headerFormatter: jest.fn().mockReturnValue('Test Header'),
    buttonColorMapper: jest.fn().mockReturnValue('black'),
    limit: 10,
    context: undefined,
    onLeftClick: jest.fn(),
    onRightClick: jest.fn(),
    ...overrides,
  };
}

describe('AuditHandler', () => {
  let auditHandler: AuditHandler;
  let mockAuditRegistry: jest.Mocked<AuditSectionRegistry>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockAlertTickerHandler: jest.Mocked<IAlertTickerHandler>;
  let mockTickerManager: jest.Mocked<IDomManager>;
  let mockSubscriber: jest.Mocked<ISubscriber>;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockJQuery).forEach((fn: any) => fn.mockReturnThis?.());

    mockAuditRegistry = {
      mustGetSection: jest.fn(),
      listSections: jest.fn().mockReturnValue([]),
      listSectionsOrdered: jest.fn().mockReturnValue([]),
    } as any;

    mockUIUtil = { buildLabel: jest.fn().mockReturnValue(mockJQuery), buildButton: jest.fn().mockReturnValue(mockJQuery) } as any;

    mockTickerHandler = { openTicker: jest.fn(), stopTracking: jest.fn(), processCommand: jest.fn() } as any;
    mockAlertTickerHandler = { linkInvestingTicker: jest.fn().mockResolvedValue(undefined) } as any;
    mockTickerManager = { getTicker: jest.fn().mockReturnValue('TCS'), getInvestingTicker: jest.fn().mockReturnValue('TCS_INV') } as any;

    mockSubscriber = {
      subscribe: jest.fn(),
      subscribeMany: jest.fn(),
    } as any;

    auditHandler = new AuditHandler(mockAuditRegistry, mockUIUtil, mockTickerHandler, mockAlertTickerHandler, mockTickerManager);
  });

  describe('registerEvents', () => {
    it('subscribes to FIRST_LOAD', () => {
      auditHandler.registerEvents(mockSubscriber);
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(DomainEventType.FIRST_LOAD, expect.any(Function));
    });

    it('subscribes to ALERTS_CHANGED, ALERT_TICKER_LINKED, and ALERT_TICKER_DELETED', () => {
      auditHandler.registerEvents(mockSubscriber);
      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [DomainEventType.ALERTS_CHANGED, DomainEventType.ALERT_TICKER_LINKED, DomainEventType.ALERT_TICKER_DELETED],
        expect.any(Function)
      );
    });

    it('subscribes to TICKER_CATEGORY_CHANGED', () => {
      auditHandler.registerEvents(mockSubscriber);
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(DomainEventType.TICKER_CATEGORY_CHANGED, expect.any(Function));
    });

    it('subscribes to TICKER_TRACKING_STARTED', () => {
      auditHandler.registerEvents(mockSubscriber);
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(DomainEventType.TICKER_TRACKING_STARTED, expect.any(Function));
    });

    it('subscribes to TICKER_TRACKING_STOPPED', () => {
      auditHandler.registerEvents(mockSubscriber);
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(DomainEventType.TICKER_TRACKING_STOPPED, expect.any(Function));
    });
  });

  describe('FIRST_LOAD triggers full audit', () => {
    beforeEach(() => {
      const alertsSection = makeSection({ id: 'alert-coverage', title: 'Alerts Coverage' });
      mockAuditRegistry.mustGetSection.mockReturnValue(alertsSection);
    });

    it('creates toolbar buttons when triggered by FIRST_LOAD', () => {
      auditHandler.registerEvents(mockSubscriber);

      // Get the FIRST_LOAD handler and invoke it
      const firstLoadHandler = mockSubscriber.subscribe.mock.calls.find(
        (call) => call[0] === DomainEventType.FIRST_LOAD
      )?.[1] as () => void;
      expect(firstLoadHandler).toBeDefined();
      firstLoadHandler();

      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH, '\u{1F504} Refresh', expect.any(Function)
      );
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_STOP_TRACKING, expect.stringContaining('Stop'), expect.any(Function)
      );
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_MAP_ALERT, expect.any(String), expect.any(Function)
      );
    });
  });

  describe('button color mapping', () => {
    const colorMapper = (r: any) => {
      if (r.code === AlertState.SINGLE_ALERT) return 'darkorange';
      if (r.code === AlertState.NO_ALERTS) return 'darkgray';
      return 'black';
    };

    it('SINGLE_ALERT maps to darkorange', () => {
      expect(colorMapper({ code: AlertState.SINGLE_ALERT })).toBe('darkorange');
    });

    it('NO_ALERTS maps to darkgray', () => {
      expect(colorMapper({ code: AlertState.NO_ALERTS })).toBe('darkgray');
    });
  });
});
