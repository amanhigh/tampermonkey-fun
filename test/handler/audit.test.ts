import { AuditHandler } from '../../src/handler/audit';
import { AuditSectionRegistry } from '../../src/util/audit_registry';
import { IUIUtil } from '../../src/util/ui';
import { AlertState } from '../../src/models/alert';
import { Constants } from '../../src/models/constant';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { IDomManager } from '../../src/manager/dom';

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

    auditHandler = new AuditHandler(mockAuditRegistry, mockUIUtil, mockTickerHandler, mockAlertTickerHandler, mockTickerManager);
  });

  describe('auditAllOnFirstRun', () => {
    beforeEach(() => {
      const alertsSection = makeSection({ id: 'alerts', title: 'Alerts Coverage' });
      mockAuditRegistry.mustGetSection.mockReturnValue(alertsSection);
    });

    it('runs audits on first call', async () => {
      await auditHandler.auditAllOnFirstRun();
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH, '\u{1F504} Refresh', expect.any(Function)
      );
    });

    it('does not run audits on second call', async () => {
      jest.clearAllMocks();
      await auditHandler.auditAllOnFirstRun();
      const firstCount = mockUIUtil.buildButton.mock.calls.length;
      jest.clearAllMocks();
      await auditHandler.auditAllOnFirstRun();
      expect(mockUIUtil.buildButton.mock.calls.length).toBe(0);
      expect(firstCount).toBeGreaterThan(0);
    });
  });

  describe('toolbar buttons', () => {
    beforeEach(() => {
      mockAuditRegistry.mustGetSection.mockReturnValue(makeSection({ id: 'alerts', title: 'Alerts Coverage' }));
    });

    it('creates global refresh button', async () => {
      await auditHandler.auditAll();
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH, '\u{1F504} Refresh', expect.any(Function)
      );
    });

    it('creates stop tracking button', async () => {
      await auditHandler.auditAll();
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_STOP_TRACKING, expect.stringContaining('Stop'), expect.any(Function)
      );
    });

    it('creates map alert button', async () => {
      await auditHandler.auditAll();
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
