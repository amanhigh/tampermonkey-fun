import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { IDomManager } from '../../src/manager/dom';
import { ILifecycleManager } from '../../src/manager/lifecycle';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';
import { SequenceType } from '../../src/models/trading';
import { Ticker } from '../../src/models/ticker';
import { Notifier } from '../../src/util/notify';

// ── Mock jQuery ──
let mockDisplayEl: any;

const mockJQuery = jest.fn((selector: string) => {
  // Return mock display element for aman-display, otherwise default
  if (selector === '#aman-display') {
    return mockDisplayEl;
  }
  return {
    val: jest.fn(),
    css: jest.fn(),
    html: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    text: jest.fn(),
  };
});
(global as any).$ = mockJQuery;

// ── Mock Notifier ──
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

// ── Helpers ──

const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
  symbol: 'INVESTINGTICKER',
  pair_id: 'pair1',
  name: 'Test Pair',
  exchange: 'NSE',
  type: 'SECONDARY',
  ticker: 'TVTICKER',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('SequenceHandler', () => {
  let sequenceHandler: SequenceHandler;
  let mockSequenceManager: jest.Mocked<ISequenceManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockLifecycleManager: jest.Mocked<ILifecycleManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;

  beforeEach(() => {
    const dataStore: Record<string, any> = {};
    mockDisplayEl = {
      html: jest.fn(),
      off: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      addClass: jest.fn().mockReturnThis(),
      removeClass: jest.fn().mockReturnThis(),
      data: jest.fn((key: string, value?: any) => {
        if (value !== undefined) {
          dataStore[key] = value;
          return mockDisplayEl;
        }
        return dataStore[key];
      }),
      toggleClass: jest.fn(),
    };

    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockResolvedValue(SequenceType.MWD),
      flipSequence: jest.fn().mockResolvedValue(undefined),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDomManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
    } as any;

    mockLifecycleManager = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
    } as any;

    sequenceHandler = new SequenceHandler(
      mockSequenceManager,
      mockDomManager,
      mockAlertTickerManager,
      mockLifecycleManager
    );
  });

  // ── displaySequence ──

  describe('displaySequence', () => {
    it('should render compact mapped display with primary ticker, sequence, and alert count', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await sequenceHandler.displaySequence();

      // Verify it fetched linked tickers for the TV ticker
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TVTICKER');

      // Verify compact HTML rendered with mapped emoji, primary ticker, sequence, and count
      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('🔗');
      expect(html).toContain('INFY');
      expect(html).toContain('MWD');
      expect(html).toContain('🔔1');
    });

    it('should render unmapped compact display with warning emoji and zero alert count', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await sequenceHandler.displaySequence();

      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('⚠️');
      expect(html).toContain('TVTICKER');
      expect(html).toContain('🔔0');
    });

    it('should set mapped css class when ticker is mapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await sequenceHandler.displaySequence();

      expect(mockDisplayEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-mapped');
    });

    it('should set unmapped css class when ticker is unmapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await sequenceHandler.displaySequence();

      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-unmapped');
    });

    it('should attach click handler to display element', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await sequenceHandler.displaySequence();

      expect(mockDisplayEl.off).toHaveBeenCalledWith('click');
      expect(mockDisplayEl.on).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  // ── Expanded / Toggle ──

  describe('expanded display toggle', () => {
    it('should render expanded rows with primary and secondary tickers on click', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', ticker: 'TVTICKER' }),
        makeAlertTicker({ type: 'SECONDARY', symbol: 'INFY.PA', name: 'Infosys CDR', exchange: 'XPAR', ticker: 'TVTICKER' }),
      ]);

      // Initial render (compact)
      await sequenceHandler.displaySequence();

      // Click to expand — grab the click handler
      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      // Second render (expanded) — html called again
      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      // Should contain compact header
      expect(expandedHtml).toContain('🔗');
      expect(expandedHtml).toContain('MWD');
      expect(expandedHtml).toContain('🔔2');

      // Should contain primary row
      expect(expandedHtml).toContain('⭐');
      expect(expandedHtml).toContain('INFY');
      expect(expandedHtml).toContain('Infosys Ltd');

      // Should contain secondary row
      expect(expandedHtml).toContain('🔹');
      expect(expandedHtml).toContain('INFY.PA');
      expect(expandedHtml).toContain('Infosys CDR');
    });

    it('should render unmapped expanded empty state on click', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      // Initial render
      await sequenceHandler.displaySequence();

      // Click to expand
      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(expandedHtml).toContain('No linked alert tickers');
    });

    it('should toggle back to compact on second click', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      // Initial compact render
      await sequenceHandler.displaySequence();

      // Click to expand
      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      // Click again to collapse back to compact
      // After expand, a new click handler is attached. We need to call the new one.
      // The second click handler is the second `on` call
      const secondClickHandler = mockDisplayEl.on.mock.calls[1][1];
      await secondClickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const finalHtml = htmlCalls[htmlCalls.length - 1][0];

      // Should be compact again (no expanded section div)
      expect(finalHtml).not.toContain('aman-display-expanded');
    });
  });

  // ── handleSequenceSwitch ──

  describe('handleSequenceSwitch', () => {
    it('should flip sequence, reset expanded, and display', async () => {
      mockSequenceManager.flipSequence.mockResolvedValue(undefined);
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      // First expand
      await sequenceHandler.displaySequence();
      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler(); // now expanded

      // Then switch sequence
      await sequenceHandler.handleSequenceSwitch();

      // Should render compact (expanded reset)
      const htmlAfterSwitch = mockDisplayEl.html.mock.calls[mockDisplayEl.html.mock.calls.length - 1][0];
      expect(htmlAfterSwitch).not.toContain('aman-display-expanded');
    });
  });

  // ── startTracking ──

  describe('startTracking', () => {
    it('should start tracking current ticker with MWD sequence timeframes', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockLifecycleManager.startTracking.mockResolvedValue({ ticker: 'TVTICKER' } as Ticker);

      await sequenceHandler.startTracking();

      expect(mockLifecycleManager.startTracking).toHaveBeenCalledWith({
        ticker: 'TVTICKER',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: expect.any(String),
      });
      expect(Notifier.success).toHaveBeenCalledWith('⏺ Started tracking TVTICKER');
    });

    it('should use YR sequence timeframes when current sequence is YR', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockLifecycleManager.startTracking.mockResolvedValue({ ticker: 'TVTICKER' } as Ticker);

      await sequenceHandler.startTracking();

      expect(mockLifecycleManager.startTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        })
      );
    });

    it('should warn when start tracking fails', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockLifecycleManager.startTracking.mockRejectedValue(new Error('Already exists'));

      await sequenceHandler.startTracking();

      expect(Notifier.warn).toHaveBeenCalledWith('Failed to start tracking TVTICKER: Already exists');
    });
  });
});
