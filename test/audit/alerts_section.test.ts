import { AlertsAuditSection } from '../../src/handler/alerts_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { IPairHandler } from '../../src/handler/pair';
import { AlertState } from '../../src/models/alert';
import { Notifier } from '../../src/util/notify';

describe('AlertsAuditSection', () => {
  let section: AlertsAuditSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifyRedSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlugin = {
      id: 'alerts',
      title: 'Alerts',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
    };

    mockSymbolManager = {
      investingToTv: jest.fn().mockReturnValue('TV_TICKER'),
    };

    mockPairHandler = {
      deletePairInfo: jest.fn(),
    };

    notifyRedSpy = jest.spyOn(Notifier, 'red').mockImplementation();

    section = new AlertsAuditSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager,
      mockPairHandler as IPairHandler
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

    test('has correct limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin', () => {
      expect(section.plugin).toBe(mockPlugin);
    });
  });

  describe('Left Click Handler', () => {
    test('opens mapped TV ticker', () => {
      const result: AuditResult = {
        pluginId: 'alerts',
        code: AlertState.NO_ALERTS,
        target: 'INFY',
        message: 'No alerts',
        severity: 'MEDIUM',
        status: 'FAIL',
      };

      section.onLeftClick(result);

      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('INFY');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    test('falls back to investing ticker when no TV mapping', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue(undefined);

      const result: AuditResult = {
        pluginId: 'alerts',
        code: AlertState.NO_PAIR,
        target: 'UNKNOWN',
        message: 'No pair',
        severity: 'HIGH',
        status: 'FAIL',
      };

      section.onLeftClick(result);

      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('UNKNOWN');
    });
  });

  describe('Right Click Handler', () => {
    test('deletes pair mapping', () => {
      const result: AuditResult = {
        pluginId: 'alerts',
        code: AlertState.NO_ALERTS,
        target: 'INFY',
        message: 'No alerts',
        severity: 'MEDIUM',
        status: 'FAIL',
      };

      section.onRightClick(result);

      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('INFY');
      expect(notifyRedSpy).toHaveBeenCalledWith('❌ Removed mapping for INFY');
    });
  });

  describe('Fix All Handler', () => {
    test('deletes all pair mappings', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'alerts',
          code: AlertState.NO_ALERTS,
          target: 'INFY',
          message: 'No alerts',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.SINGLE_ALERT,
          target: 'TCS',
          message: 'Single alert',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.NO_PAIR,
          target: 'HDFC',
          message: 'No pair',
          severity: 'HIGH',
          status: 'FAIL',
        },
      ];

      section.onFixAll!(results);

      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledTimes(3);
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('INFY');
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('TCS');
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('HDFC');
      expect(notifyRedSpy).toHaveBeenCalledWith('❌ Removed 3 pair mapping(s)');
    });

    test('handles empty results', () => {
      section.onFixAll!([]);

      expect(mockPairHandler.deletePairInfo).not.toHaveBeenCalled();
      expect(notifyRedSpy).toHaveBeenCalledWith('❌ Removed 0 pair mapping(s)');
    });
  });

  describe('Header Formatter', () => {
    test('shows success when no results', () => {
      const html = section.headerFormatter([]);
      expect(html).toContain('All alerts covered');
      expect(html).toContain('success-badge');
    });

    test('shows categorized counts', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'alerts',
          code: AlertState.SINGLE_ALERT,
          target: 'TCS',
          message: '',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.NO_ALERTS,
          target: 'INFY',
          message: '',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.NO_PAIR,
          target: 'HDFC',
          message: '',
          severity: 'HIGH',
          status: 'FAIL',
        },
      ];

      const html = section.headerFormatter(results);
      expect(html).toContain('One: 1');
      expect(html).toContain('None: 1');
      expect(html).toContain('Inv: 1');
      expect(html).toContain('Tot: 3');
    });
  });
});
