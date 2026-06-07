import { AlertsAuditSection } from '../../src/handler/alerts_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { Notifier } from '../../src/util/notify';

describe('AlertsAuditSection', () => {
  let section: AlertsAuditSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (target: string, code = 'NO_ALERTS'): AuditResult => ({
    pluginId: 'alert-coverage',
    code,
    target,
    message: `${target}: ${code}`,
    severity: 'MEDIUM',
    status: 'FAIL',
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'alert-coverage',
      title: 'Alert Coverage',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
      stopTracking: jest.fn().mockResolvedValue(undefined),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();

    section = new AlertsAuditSection(mockPlugin, mockTickerHandler as ITickerHandler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct backend id', () => {
      expect(section.id).toBe('alert-coverage');
    });

    test('has correct title', () => {
      expect(section.title).toBe('Alerts Coverage');
    });

    test('has pagination limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin reference', () => {
      expect(section.plugin).toBe(mockPlugin);
    });
  });

  describe('onLeftClick', () => {
    test('opens TV ticker directly', () => {
      section.onLeftClick(createResult('NSE:INFY'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('NSE:INFY');
    });
  });

  describe('onRightClick', () => {
    test('stops tracking TV ticker directly', async () => {
      await section.onRightClick(createResult('NSE:INFY'));
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('NSE:INFY');
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all result TV tickers', async () => {
      const results = [createResult('TV_A'), createResult('TV_B'), createResult('TV_C')];

      await section.onFixAll!(results);

      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(3);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_A');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_B');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_C');
      expect(notifySuccessSpy).toHaveBeenCalledWith('⏹ Stopped tracking 3 ticker(s)');
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('All alerts covered');
    });

    test('shows counts for backend alert coverage finding codes', () => {
      const results: AuditResult[] = [
        createResult('A', 'NO_ALERT_TICKER'),
        createResult('B', 'SINGLE_ALERT'),
        createResult('C', 'NO_ALERTS'),
      ];

      const html = section.headerFormatter(results);

      expect(html).toContain('NoMap: 1');
      expect(html).toContain('One: 1');
      expect(html).toContain('None: 1');
      expect(html).toContain('Tot: 3');
    });
  });
});
