import { TickerCollisionSection } from '../../src/handler/ticker_collision_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { Notifier } from '../../src/util/notify';

describe('TickerCollisionSection', () => {
  let section: TickerCollisionSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
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
    mockSymbolManager = { deleteTvTicker: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new TickerCollisionSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager
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
    test('opens first tvTicker alias in TradingView', () => {
      section.onLeftClick(createResult('M&M', ['M_M', 'M&M']));
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
  });

  describe('onRightClick', () => {
    test('deletes stale tvTicker aliases (keeps first as canonical)', () => {
      section.onRightClick(createResult('M&M', ['M_M', 'M&M', 'M&amp;M']));
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when less than 2 tvTickers', () => {
      section.onRightClick(createResult('M&M', ['M_M']));
      expect(notifySuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('deletes all stale aliases across groups', () => {
      const results = [
        createResult('M&M', ['M_M', 'M&M', 'M&amp;M']),
        createResult('PTC', ['PTC', 'PFS']),
      ];
      section.onFixAll!(results);
      expect(notifySuccessSpy).toHaveBeenCalled();
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
