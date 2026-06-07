import { StaleReviewSection } from '../../src/handler/stale_review_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { Notifier } from '../../src/util/notify';

describe('StaleReviewSection', () => {
  let section: StaleReviewSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (tvTicker: string, daysSinceOpen: number): AuditResult => ({
    code: 'STALE_TICKER',
    target: tvTicker,
    severity: 'MEDIUM',
    data: { tvTicker, lastOpened: 0, daysSinceOpen },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'stale-review',
      title: 'Stale Review',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn(), stopTracking: jest.fn().mockResolvedValue(undefined) };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(true);

    section = new StaleReviewSection(mockPlugin, mockTickerHandler as ITickerHandler);
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
    test('stops tracking after confirmation', async () => {
      await section.onRightClick(createResult('TCS', 100));
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TCS');
    });

    test('does nothing when user cancels', async () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      await section.onRightClick(createResult('TCS', 100));
      expect(mockTickerHandler.stopTracking).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all stale tickers after confirmation', async () => {
      const results = [createResult('A', 100), createResult('B', -1)];
      await section.onFixAll!(results);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(2);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('does nothing when user cancels', async () => {
      (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(false);
      await section.onFixAll!([createResult('A', 100)]);
      expect(mockTickerHandler.stopTracking).not.toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No stale review issues');
    });
  });
});
