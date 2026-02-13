import { GoldenSection } from '../../src/handler/golden_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { ISymbolManager } from '../../src/manager/symbol';
import { Notifier } from '../../src/util/notify';

describe('GoldenSection', () => {
  let section: GoldenSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyWarnSpy: jest.SpyInstance;

  const createResult = (investingTicker: string): AuditResult => ({
    pluginId: 'golden',
    code: 'NO_TV_MAPPING',
    target: investingTicker,
    message: `${investingTicker}: NO_TV_MAPPING`,
    severity: 'HIGH',
    status: 'FAIL',
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'golden',
      title: 'Golden Integrity',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockPairHandler = { stopTrackingByInvestingTicker: jest.fn() };
    mockSymbolManager = {
      investingToTv: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new GoldenSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler,
      mockSymbolManager as ISymbolManager
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('golden'));
    test('has correct title', () => expect(section.title).toBe('Golden Integrity'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens tvTicker in TradingView when mapping exists', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('TCS_TV');
      section.onLeftClick(createResult('TCS'));
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('TCS');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('TCS_TV');
    });

    test('shows warning when no TV mapping exists', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue(null);
      section.onLeftClick(createResult('UNKNOWN'));
      expect(notifyWarnSpy).toHaveBeenCalled();
      expect(mockTickerHandler.openTicker).not.toHaveBeenCalled();
    });
  });

  describe('onRightClick', () => {
    test('stops tracking investing ticker with cascade cleanup', () => {
      section.onRightClick(createResult('TCS'));
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('TCS');
    });
  });

  describe('onFixAll', () => {
    test('bulk-stops tracking all golden integrity violations', () => {
      const results = [createResult('A'), createResult('B'), createResult('C')];
      section.onFixAll!(results);

      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledTimes(3);
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('A');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('B');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('C');
      expect(notifySuccessSpy).toHaveBeenCalledWith('✓ Stopped tracking 3 golden integrity violation(s)');
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No golden integrity issues');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('TCS')])).toContain('1');
    });
  });
});
