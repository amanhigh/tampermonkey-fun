import { AlertsAuditSection } from '../../src/handler/alerts_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { AlertState } from '../../src/models/alert';
import { Notifier } from '../../src/util/notify';

describe('AlertsAuditSection', () => {
  let section: AlertsAuditSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let notifySuccessSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlugin = {
      id: 'alerts',
      title: 'Alerts',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
      stopTracking: jest.fn().mockResolvedValue(undefined),
    };

    mockSymbolManager = {
      investingToTv: jest.fn().mockReturnValue('TV_TICKER'),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new AlertsAuditSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => {
      expect(section.id).toBe('alerts');
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
    const createResult = (target: string, code: AlertState = AlertState.NO_ALERTS): AuditResult => ({
      pluginId: 'alerts',
      code,
      target,
      message: `${target}: ${code}`,
      severity: 'MEDIUM',
      status: 'FAIL',
    });

    test('opens investing ticker via tickerHandler', () => {
      section.onLeftClick(createResult('INFY'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    test('falls back to original ticker when no mapping exists', () => {
      mockSymbolManager.investingToTv = jest.fn().mockReturnValue(null);
      section.onLeftClick(createResult('INFY'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('INFY');
    });
  });

  describe('onRightClick', () => {
    const createResult = (target: string): AuditResult => ({
      pluginId: 'alerts',
      code: AlertState.NO_PAIR,
      target,
      message: `${target}: NO_PAIR`,
      severity: 'HIGH',
      status: 'FAIL',
    });

    test('stops tracking via tvTicker when mapping exists', async () => {
      await section.onRightClick(createResult('INFY'));
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_TICKER');
    });

    test('does not stop tracking when no tvTicker mapping exists', async () => {
      mockSymbolManager.investingToTv = jest.fn().mockReturnValue(null);
      await section.onRightClick(createResult('INFY'));
      expect(mockTickerHandler.stopTracking).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    const createResult = (target: string): AuditResult => ({
      pluginId: 'alerts',
      code: AlertState.NO_PAIR,
      target,
      message: `${target}: NO_PAIR`,
      severity: 'HIGH',
      status: 'FAIL',
    });

    test('stops tracking all tickers with tvTicker mappings', async () => {
      mockSymbolManager.investingToTv = jest
        .fn()
        .mockReturnValueOnce('TV_A')
        .mockReturnValueOnce('TV_B')
        .mockReturnValueOnce('TV_C');

      const results = [createResult('A'), createResult('B'), createResult('C')];
      await section.onFixAll!(results);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(3);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_A');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_B');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_C');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('skips tickers with no tvTicker mapping', async () => {
      mockSymbolManager.investingToTv = jest
        .fn()
        .mockReturnValueOnce('TV_A')
        .mockReturnValueOnce(null) // B has no mapping
        .mockReturnValueOnce('TV_C');

      const results = [createResult('A'), createResult('B'), createResult('C')];
      await section.onFixAll!(results);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(2);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_A');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TV_C');
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('All alerts covered');
    });

    test('shows counts for different states', () => {
      const results: AuditResult[] = [
        { code: AlertState.SINGLE_ALERT, target: 'A', message: '', severity: 'HIGH', status: 'FAIL', pluginId: '' },
        { code: AlertState.NO_ALERTS, target: 'B', message: '', severity: 'HIGH', status: 'FAIL', pluginId: '' },
        { code: AlertState.NO_PAIR, target: 'C', message: '', severity: 'HIGH', status: 'FAIL', pluginId: '' },
      ];
      const html = section.headerFormatter(results);
      expect(html).toContain('One: 1');
      expect(html).toContain('None: 1');
      expect(html).toContain('Inv: 1');
    });
  });
});
