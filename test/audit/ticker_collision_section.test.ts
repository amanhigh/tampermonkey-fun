import { TickerCollisionSection } from '../../src/handler/ticker_collision_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ICanonicalRanker } from '../../src/manager/canonical_ranker';
import { ISymbolManager } from '../../src/manager/symbol';
import { Notifier } from '../../src/util/notify';

describe('TickerCollisionSection', () => {
  let section: TickerCollisionSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockCanonicalRanker: Partial<ICanonicalRanker>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyWarnSpy: jest.SpyInstance;

  const createResult = (investingTicker: string, tvTickers: string[]): AuditResult => ({
    pluginId: 'ticker-collision',
    code: 'TICKER_COLLISION',
    target: investingTicker,
    message: `${investingTicker}: ${tvTickers.length} aliases`,
    severity: 'MEDIUM',
    status: 'FAIL',
    data: { investingTicker, tvTickers },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'ticker-collision',
      title: 'Ticker Reverse Map Collisions',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockCanonicalRanker = {
      rankTvTickers: jest.fn().mockImplementation((tickers: string[]) =>
        tickers.map((t, i) => ({ ticker: t, alertCount: 0, isWatched: false, recentTimestamp: 0, hasSequence: false, hasExchange: false, hasPairMapping: true, score: tickers.length - i }))
      ),
    };
    mockSymbolManager = { investingToTv: jest.fn(), deleteTvTicker: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();
    (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(true);

    section = new TickerCollisionSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager,
      mockCanonicalRanker as ICanonicalRanker
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('ticker-collision'));
    test('has correct title', () => expect(section.title).toBe('Ticker Collisions'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens canonical tvTicker alias via CanonicalRanker', () => {
      section.onLeftClick(createResult('M&M', ['M_M', 'M&M']));
      expect(mockCanonicalRanker.rankTvTickers).toHaveBeenCalledWith(['M_M', 'M&M']);
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('M_M');
    });

    test('shows warning when no tvTickers available', () => {
      const result: AuditResult = {
        pluginId: 'ticker-collision',
        code: 'TICKER_COLLISION',
        target: 'EMPTY',
        message: 'EMPTY: no aliases',
        severity: 'MEDIUM',
        status: 'FAIL',
        data: { investingTicker: 'EMPTY' },
      };
      section.onLeftClick(result);
      expect(notifyWarnSpy).toHaveBeenCalled();
    });

    test('shows warning when less than 2 tvTickers and no fallback', () => {
      section.onLeftClick(createResult('M&M', ['M_M']));
      expect(notifyWarnSpy).toHaveBeenCalled();
      expect(mockCanonicalRanker.rankTvTickers).not.toHaveBeenCalled();
    });

    test('falls back to investingTicker resolution when less than 2 tvTickers', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('M_M_RESOLVED');
      const result: AuditResult = {
        pluginId: 'ticker-collision',
        code: 'TICKER_COLLISION',
        target: 'M&M',
        message: 'M&M: 1 alias',
        severity: 'MEDIUM',
        status: 'FAIL',
        data: { investingTicker: 'M&M', tvTickers: ['M_M'] },
      };
      section.onLeftClick(result);
      expect(mockSymbolManager.investingToTv).toHaveBeenCalledWith('M&M');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('M_M_RESOLVED');
      expect(notifyWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('onRightClick', () => {
    test('ranks aliases and removes lower-ranked after confirmation', () => {
      section.onRightClick(createResult('M&M', ['M_M', 'M&M', 'M&amp;M']));
      expect(mockCanonicalRanker.rankTvTickers).toHaveBeenCalledWith(['M_M', 'M&M', 'M&amp;M']);
      expect(mockSymbolManager.deleteTvTicker).toHaveBeenCalledTimes(2);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when less than 2 tvTickers', () => {
      section.onRightClick(createResult('M&M', ['M_M']));
      expect(notifySuccessSpy).not.toHaveBeenCalled();
    });

    test('does nothing when user cancels confirmation', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onRightClick(createResult('M&M', ['M_M', 'M&M']));
      expect(mockSymbolManager.deleteTvTicker).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('ranks and removes all lower-ranked aliases across groups after confirmation', () => {
      const results = [
        createResult('M&M', ['M_M', 'M&M', 'M&amp;M']),
        createResult('PTC', ['PTC', 'PFS']),
      ];
      section.onFixAll!(results);
      // Group 1: keeps M_M, removes M&M, M&amp;M. Group 2: keeps PTC, removes PFS.
      expect(mockSymbolManager.deleteTvTicker).toHaveBeenCalledTimes(3);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when user cancels confirmation', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onFixAll!([createResult('M&M', ['M_M', 'M&M'])]);
      expect(mockSymbolManager.deleteTvTicker).not.toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No ticker collisions');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('M&M', ['M_M', 'M&M'])])).toContain('1');
    });
  });
});
