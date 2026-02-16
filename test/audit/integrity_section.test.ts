import { IntegritySection } from '../../src/handler/integrity_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('IntegritySection', () => {
  let section: IntegritySection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (investingTicker: string): AuditResult => ({
    pluginId: 'integrity',
    code: 'NO_TV_MAPPING',
    target: investingTicker,
    message: `${investingTicker}: Pair exists but has no TradingView mapping`,
    severity: 'HIGH',
    status: 'FAIL',
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'integrity',
      title: 'Integrity',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockPairHandler = {
      stopTrackingByInvestingTicker: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();

    section = new IntegritySection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('integrity'));
    test('has correct title', () => expect(section.title).toBe('Integrity'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens investingTicker in TradingView', () => {
      section.onLeftClick(createResult('TCS'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('TCS');
    });
  });

  describe('onRightClick', () => {
    test('stops tracking the investing ticker with full cascade', () => {
      section.onRightClick(createResult('MINDTREE'));
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('MINDTREE');
    });
  });

  describe('onFixAll', () => {
    test('bulk-stops tracking all results', () => {
      const results = [createResult('A'), createResult('B'), createResult('C')];
      section.onFixAll!(results);

      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledTimes(3);
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('A');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('B');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('C');
      expect(notifySuccessSpy).toHaveBeenCalledWith('⏹ Stopped tracking 3 ticker(s)');
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No integrity issues');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('TCS')])).toContain('1');
    });
  });
});
