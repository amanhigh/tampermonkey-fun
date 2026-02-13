import { DuplicatePairIdsSection } from '../../src/handler/duplicate_pair_ids_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { IPairManager } from '../../src/manager/pair';
import { ICanonicalRanker } from '../../src/manager/canonical_ranker';
import { Notifier } from '../../src/util/notify';

describe('DuplicatePairIdsSection', () => {
  let section: DuplicatePairIdsSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let mockPairManager: Partial<IPairManager>;
  let mockCanonicalRanker: Partial<ICanonicalRanker>;
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
    mockSymbolManager = { investingToTv: jest.fn() };
    mockPairManager = { removePairByInvestingTicker: jest.fn() };
    mockCanonicalRanker = {
      rankInvestingTickers: jest.fn().mockImplementation((tickers: string[]) =>
        tickers.map((t, i) => ({ ticker: t, alertCount: 0, isWatched: false, recentTimestamp: 0, hasSequence: false, hasExchange: false, hasPairMapping: true, score: tickers.length - i }))
      ),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();
    (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(true);

    section = new DuplicatePairIdsSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager,
      mockCanonicalRanker as ICanonicalRanker,
      mockPairManager as IPairManager
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
    test('opens canonical investingTicker resolved tvTicker via CanonicalRanker', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('HDFC_TV');
      section.onLeftClick(createResult('123', ['HDFC', 'HDF']));
      expect(mockCanonicalRanker.rankInvestingTickers).toHaveBeenCalledWith(['HDFC', 'HDF'], '123');
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('HDFC');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('HDFC_TV');
    });

    test('shows warning when canonical ticker has no tvTicker mapping', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue(null);
      section.onLeftClick(createResult('123', ['HDFC', 'HDF']));
      expect(notifyWarnSpy).toHaveBeenCalled();
    });

    test('does nothing when less than 2 investingTickers', () => {
      section.onLeftClick(createResult('123', ['ONLY']));
      expect(mockCanonicalRanker.rankInvestingTickers).not.toHaveBeenCalled();
      expect(mockTickerHandler.openTicker).not.toHaveBeenCalled();
    });
  });

  describe('onRightClick', () => {
    test('ranks tickers and removes lower-ranked aliases after confirmation', () => {
      section.onRightClick(createResult('123', ['CANONICAL', 'DUP1', 'DUP2']));
      expect(mockCanonicalRanker.rankInvestingTickers).toHaveBeenCalledWith(['CANONICAL', 'DUP1', 'DUP2'], '123');
      expect(mockPairManager.removePairByInvestingTicker).toHaveBeenCalledTimes(2);
      expect(mockPairManager.removePairByInvestingTicker).toHaveBeenCalledWith('DUP1');
      expect(mockPairManager.removePairByInvestingTicker).toHaveBeenCalledWith('DUP2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when less than 2 investingTickers', () => {
      section.onRightClick(createResult('123', ['ONLY']));
      expect(mockPairManager.removePairByInvestingTicker).not.toHaveBeenCalled();
    });

    test('does nothing when user cancels confirmation', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onRightClick(createResult('123', ['A', 'B', 'C']));
      expect(mockPairManager.removePairByInvestingTicker).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('ranks and removes all lower-ranked aliases across groups after confirmation', () => {
      const results = [
        createResult('123', ['A', 'B', 'C']),
        createResult('456', ['D', 'E']),
      ];
      section.onFixAll!(results);
      // Group 1: keeps A, removes B, C. Group 2: keeps D, removes E.
      expect(mockPairManager.removePairByInvestingTicker).toHaveBeenCalledTimes(3);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when user cancels confirmation', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onFixAll!([createResult('123', ['A', 'B'])]);
      expect(mockPairManager.removePairByInvestingTicker).not.toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No duplicate pairids');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('123', ['A', 'B'])])).toContain('1');
    });
  });
});
