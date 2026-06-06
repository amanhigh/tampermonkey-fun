import { TickerCollisionSection } from '../../src/handler/ticker_collision_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ICanonicalRanker } from '../../src/manager/canonical_ranker';
import { Notifier } from '../../src/util/notify';

describe('TickerCollisionSection', () => {
  let section: TickerCollisionSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockAlertTickerManager: Partial<IAlertTickerManager>;
  let mockCanonicalRanker: Partial<ICanonicalRanker>;
  let notifySuccessSpy: jest.SpyInstance;
  const createResult = (investingTicker: string, tvTickers: string[]): AuditResult => ({
    pluginId: 'ticker-collision',
    code: 'TICKER_COLLISION',
    target: investingTicker,
    message: `${investingTicker}: Multiple TV tickers: ${tvTickers.join(', ')}`,
    severity: 'HIGH',
    status: 'FAIL',
    data: { investingTicker, tvTickers },
  });

  const mockRankResponse = (tickers: string[]) =>
    Promise.resolve(tickers.map((t, i) => ({ ticker: t, alertCount: 0, isWatched: false, isRecent: false, hasExchange: false, hasPairMapping: true, score: tickers.length - i })));

  beforeEach(() => {
    mockPlugin = {
      id: 'ticker-collision',
      title: 'Ticker Reverse Map Collisions',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn().mockResolvedValue(undefined), stopTracking: jest.fn() };
    mockAlertTickerManager = { fetchAlertTicker: jest.fn() };
    mockCanonicalRanker = {
      rankTvTickers: jest.fn().mockImplementation((tickers: string[]) => mockRankResponse(tickers)),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    (globalThis as Record<string, unknown>).confirm = jest.fn().mockReturnValue(true);

    section = new TickerCollisionSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockAlertTickerManager as IAlertTickerManager,
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
    test('opens canonical tvTicker alias via CanonicalRanker', async () => {
      await section.onLeftClick(createResult('HDFC', ['HDFC', 'HDFC_EQ', 'HDFC_NS']));
      expect(mockCanonicalRanker.rankTvTickers).toHaveBeenCalledWith(['HDFC', 'HDFC_EQ', 'HDFC_NS']);
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('HDFC');
    });

    test('falls back to alertTickerManager when only one tvTicker in data', async () => {
      mockAlertTickerManager.fetchAlertTicker = jest.fn().mockResolvedValue({ ticker: 'RESOLVED' });
      await section.onLeftClick(createResult('HDFC', ['HDFC']));
      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('HDFC');
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('RESOLVED');
    });
  });

  describe('onRightClick', () => {
    test('ranks aliases and removes lower-ranked after confirmation', async () => {
      // Mock stopTracking for removal test
      mockTickerHandler.stopTracking = jest.fn().mockResolvedValue(undefined);

      await section.onRightClick(createResult('HDFC', ['KEEP', 'REMOVE1', 'REMOVE2']));
      expect(mockCanonicalRanker.rankTvTickers).toHaveBeenCalledWith(['KEEP', 'REMOVE1', 'REMOVE2']);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(2);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('REMOVE1');
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('REMOVE2');
    });
  });

  describe('onFixAll', () => {
    test('ranks and removes all lower-ranked aliases across groups after confirmation', async () => {
      mockTickerHandler.stopTracking = jest.fn().mockResolvedValue(undefined);

      const results = [
        createResult('INV1', ['A', 'B', 'C']),
        createResult('INV2', ['D', 'E']),
      ];
      await section.onFixAll!(results);
      // A kept, B+C removed; D kept, E removed = 3 total removals
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledTimes(3);
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No ticker collisions');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('HDFC', ['A', 'B'])])).toContain('1');
    });
  });

  describe('buttonColorMapper', () => {
    test('maps HIGH severity', () => {
      const result = createResult('HDFC', ['A', 'B']);
      const color = section.buttonColorMapper(result);
      expect(color).toBeDefined();
    });
  });
});
