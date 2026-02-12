import { StaleReviewSection } from '../../src/handler/stale_review_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('StaleReviewSection', () => {
  let section: StaleReviewSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (tvTicker: string, daysSinceOpen: number): AuditResult => ({
    pluginId: 'stale-review',
    code: 'STALE_TICKER',
    target: tvTicker,
    message: daysSinceOpen >= 0 ? `${tvTicker}: last opened ${daysSinceOpen} days ago` : `${tvTicker}: never opened`,
    severity: daysSinceOpen < 0 ? 'HIGH' : 'MEDIUM',
    status: 'FAIL',
    data: { tvTicker, lastOpened: 0, daysSinceOpen, watchCategories: [], flagCategories: [] },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'stale-review',
      title: 'Stale Review',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockPairHandler = { stopTrackingByTvTicker: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(true);

    section = new StaleReviewSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('stale-review'));
    test('has correct title', () => expect(section.title).toBe('Stale Review'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens ticker in TradingView', () => {
      section.onLeftClick(createResult('TCS', 100));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('TCS');
    });
  });

  describe('onRightClick', () => {
    test('stops tracking after confirmation', () => {
      section.onRightClick(createResult('TCS', 100));
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('TCS');
    });

    test('does nothing when user cancels', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onRightClick(createResult('TCS', 100));
      expect(mockPairHandler.stopTrackingByTvTicker).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all stale tickers after confirmation', () => {
      const results = [createResult('A', 100), createResult('B', -1)];
      section.onFixAll!(results);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledTimes(2);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when user cancels', () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      section.onFixAll!([createResult('A', 100)]);
      expect(mockPairHandler.stopTrackingByTvTicker).not.toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No stale review issues');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('TCS', 100)])).toContain('1');
    });
  });
});
