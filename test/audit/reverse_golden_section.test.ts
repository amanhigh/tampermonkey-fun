import { ReverseGoldenSection } from '../../src/handler/reverse_golden_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('ReverseGoldenSection', () => {
  let section: ReverseGoldenSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlugin = {
      id: 'reverse-golden',
      title: 'ReverseGolden Integrity',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
    };

    mockPairHandler = {
      stopTrackingByInvestingTicker: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();

    section = new ReverseGoldenSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => {
      expect(section.id).toBe('reverse-golden');
    });

    test('has correct title', () => {
      expect(section.title).toBe('ReverseGolden Integrity');
    });

    test('has correct limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin', () => {
      expect(section.plugin).toBe(mockPlugin);
    });
  });

  describe('Left Click Handler', () => {
    test('opens ticker in TradingView', () => {
      const result: AuditResult = {
        pluginId: 'reverse-golden',
        code: 'NO_TV_MAPPING',
        target: 'USDINR',
        message: 'No TV mapping',
        severity: 'MEDIUM',
        status: 'FAIL',
      };

      section.onLeftClick(result);

      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('USDINR');
    });
  });

  describe('Right Click Handler', () => {
    test('deletes pair mapping', () => {
      const result: AuditResult = {
        pluginId: 'reverse-golden',
        code: 'NO_TV_MAPPING',
        target: 'USDINR',
        message: 'No TV mapping',
        severity: 'MEDIUM',
        status: 'FAIL',
      };

      section.onRightClick(result);

      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('USDINR');
    });
  });

  describe('Fix All Handler', () => {
    test('deletes all reverse golden violations', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'reverse-golden',
          code: 'UNMAPPED',
          target: 'USDINR',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'reverse-golden',
          code: 'NO_TV_MAPPING',
          target: 'BANKNIFTY',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'reverse-golden',
          code: 'NO_TV_MAPPING',
          target: 'NIFTY',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
      ];

      section.onFixAll!(results);

      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledTimes(3);
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('USDINR');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('BANKNIFTY');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('NIFTY');
      expect(notifySuccessSpy).toHaveBeenCalledWith('⏹ Stopped tracking 3 ticker(s)');
    });

    test('handles empty results', () => {
      section.onFixAll!([]);

      expect(mockPairHandler.stopTrackingByInvestingTicker).not.toHaveBeenCalled();
      expect(notifySuccessSpy).toHaveBeenCalledWith('⏹ Stopped tracking 0 ticker(s)');
    });
  });

  describe('Header Formatter', () => {
    test('shows count of reverse golden violations', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'reverse-golden',
          code: 'NO_TV_MAPPING',
          target: 'USDINR',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
      ];

      const html = section.headerFormatter(results);
      expect(html).toContain('ReverseGolden Integrity: 1');
    });

    test('shows zero count when empty', () => {
      const html = section.headerFormatter([]);
      expect(html).toContain('No reversegolden integrity issues');
    });
  });
});
