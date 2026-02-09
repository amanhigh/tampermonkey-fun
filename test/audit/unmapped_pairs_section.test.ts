import { UnmappedPairsSection } from '../../src/handler/unmapped_pairs_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('UnmappedPairsSection', () => {
  let section: UnmappedPairsSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifyRedSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlugin = {
      id: 'unmapped-pairs',
      title: 'Unmapped Pairs',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
    };

    mockPairHandler = {
      deletePairInfo: jest.fn(),
    };

    notifyRedSpy = jest.spyOn(Notifier, 'red').mockImplementation();

    section = new UnmappedPairsSection(
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
      expect(section.id).toBe('unmapped-pairs');
    });

    test('has correct title', () => {
      expect(section.title).toBe('Unmapped Pairs');
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
        pluginId: 'unmapped-pairs',
        code: 'UNMAPPED',
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
        pluginId: 'unmapped-pairs',
        code: 'UNMAPPED',
        target: 'USDINR',
        message: 'No TV mapping',
        severity: 'MEDIUM',
        status: 'FAIL',
      };

      section.onRightClick(result);

      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('USDINR');
      expect(notifyRedSpy).toHaveBeenCalledWith('🗑️ Removed unmapped pair: USDINR');
    });
  });

  describe('Fix All Handler', () => {
    test('deletes all unmapped pair mappings', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'unmapped-pairs',
          code: 'UNMAPPED',
          target: 'USDINR',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'unmapped-pairs',
          code: 'UNMAPPED',
          target: 'BANKNIFTY',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
        {
          pluginId: 'unmapped-pairs',
          code: 'UNMAPPED',
          target: 'NIFTY',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
      ];

      section.onFixAll!(results);

      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledTimes(3);
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('USDINR');
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('BANKNIFTY');
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('NIFTY');
      expect(notifyRedSpy).toHaveBeenCalledWith('🗑️ Removed 3 unmapped pair(s)');
    });

    test('handles empty results', () => {
      section.onFixAll!([]);

      expect(mockPairHandler.deletePairInfo).not.toHaveBeenCalled();
      expect(notifyRedSpy).toHaveBeenCalledWith('🗑️ Removed 0 unmapped pair(s)');
    });
  });

  describe('Header Formatter', () => {
    test('shows count of unmapped pairs', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'unmapped-pairs',
          code: 'UNMAPPED',
          target: 'USDINR',
          message: 'No TV mapping',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
      ];

      const html = section.headerFormatter(results);
      expect(html).toBe('Unmapped Pairs (1)');
    });

    test('shows zero count when empty', () => {
      const html = section.headerFormatter([]);
      expect(html).toBe('Unmapped Pairs (0)');
    });
  });
});
