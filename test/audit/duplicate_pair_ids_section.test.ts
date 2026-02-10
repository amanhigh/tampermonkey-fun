import { DuplicatePairIdsSection } from '../../src/handler/duplicate_pair_ids_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { ISymbolManager } from '../../src/manager/symbol';
import { Notifier } from '../../src/util/notify';

describe('DuplicatePairIdsSection', () => {
  let section: DuplicatePairIdsSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyWarnSpy: jest.SpyInstance;

  const createResult = (pairId: string, investingTickers: string[]): AuditResult => ({
    pluginId: 'duplicate-pair-ids',
    code: 'DUPLICATE_PAIR_ID',
    target: pairId,
    message: `PairId ${pairId}: shared by ${investingTickers.join(', ')}`,
    severity: 'MEDIUM',
    status: 'FAIL',
    data: { pairId, investingTickers },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'duplicate-pair-ids',
      title: 'Duplicate PairIds',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockPairHandler = { stopTrackingByInvestingTicker: jest.fn() };
    mockSymbolManager = { investingToTv: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new DuplicatePairIdsSection(
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
    test('has correct id', () => expect(section.id).toBe('duplicate-pair-ids'));
    test('has correct title', () => expect(section.title).toBe('Duplicate PairIds'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens first investingTicker resolved tvTicker', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('HDFC_TV');
      section.onLeftClick(createResult('123', ['HDFC', 'HDF']));
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('HDFC');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('HDFC_TV');
    });

    test('shows warning when no tvTicker mapping found', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue(null);
      section.onLeftClick(createResult('123', ['HDFC', 'HDF']));
      expect(notifyWarnSpy).toHaveBeenCalled();
    });
  });

  describe('onRightClick', () => {
    test('deletes duplicate investingTickers (keeps first as canonical)', () => {
      section.onRightClick(createResult('123', ['CANONICAL', 'DUP1', 'DUP2']));
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledTimes(2);
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('DUP1');
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledWith('DUP2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when less than 2 investingTickers', () => {
      section.onRightClick(createResult('123', ['ONLY']));
      expect(mockPairHandler.stopTrackingByInvestingTicker).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('deletes all duplicate entries across groups', () => {
      const results = [
        createResult('123', ['A', 'B', 'C']),
        createResult('456', ['D', 'E']),
      ];
      section.onFixAll!(results);
      // Group 1: deletes B, C (keeps A). Group 2: deletes E (keeps D).
      expect(mockPairHandler.stopTrackingByInvestingTicker).toHaveBeenCalledTimes(3);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No duplicate pairIds');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('123', ['A', 'B'])])).toContain('1');
    });
  });
});
