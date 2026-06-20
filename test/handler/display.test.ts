import { DisplayHandler } from '../../src/handler/display';
import { IDomManager } from '../../src/manager/dom';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';

// ── Mock jQuery ──
let mockDisplayEl: any;

const mockJQuery = jest.fn((selector: string) => {
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
    data: jest.fn(),
    toggleClass: jest.fn(),
  };
});
(global as any).$ = mockJQuery;

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

describe('DisplayHandler', () => {
  let handler: DisplayHandler;
  let mockDomManager: jest.Mocked<IDomManager>;
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

    mockDomManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
    } as any;

    handler = new DisplayHandler(mockDomManager, mockAlertTickerManager);
  });

  describe('display', () => {
    it('should render compact mapped display with primary ticker and alert count', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TVTICKER');

      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('🔗');
      expect(html).toContain('INFY');
      expect(html).toContain('🔔1');
    });

    it('should render unmapped compact display with warning emoji and zero alert count', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('⚠️');
      expect(html).toContain('TVTICKER');
      expect(html).toContain('🔔0');
    });

    it('should set mapped css class when ticker is mapped', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      expect(mockDisplayEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-mapped');
    });

    it('should set unmapped css class when ticker is unmapped', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-unmapped');
    });

    it('should attach click handler to display element', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockDisplayEl.off).toHaveBeenCalledWith('click');
      expect(mockDisplayEl.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should render the current ticker as display ticker when unmapped', async () => {
      mockDomManager.getTicker.mockReturnValue('BANKNIFTY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('BANKNIFTY');
    });

    it('should render Untracked label when backend returns ticker-not-found 404', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(new Error('404 Not Found: Ticker not found'));

      await handler.display();

      const html = mockDisplayEl.html.mock.calls[0][0];
      expect(html).toContain('⚠️');
      expect(html).toContain('Untracked · BHEL');
      expect(html).toContain('🔔0');
    });

    it('should rethrow non-404 errors instead of marking untracked', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(handler.display()).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('expanded display toggle', () => {
    it('should render expanded rows with primary and secondary tickers on click', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', ticker: 'TVTICKER' }),
        makeAlertTicker({ type: 'SECONDARY', symbol: 'INFY.PA', name: 'Infosys CDR', exchange: 'XPAR', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(expandedHtml).toContain('🔗');
      expect(expandedHtml).toContain('INFY');
      expect(expandedHtml).toContain('🔔2');
      expect(expandedHtml).toContain('⭐');
      expect(expandedHtml).toContain('Infosys Ltd');
      expect(expandedHtml).toContain('🔹');
      expect(expandedHtml).toContain('INFY.PA');
      expect(expandedHtml).toContain('Infosys CDR');
    });

    it('should render unmapped expanded empty state on click', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(expandedHtml).toContain('No linked alert tickers');
    });

    it('should render untracked expanded empty state when 404', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(new Error('404 Not Found: Ticker not found'));

      await handler.display();

      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(expandedHtml).toContain('⚠️');
      expect(expandedHtml).toContain('Untracked · BHEL');
      expect(expandedHtml).toContain('Untracked ticker — no backend record');
    });

    it('should toggle back to compact on second click', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler(); // expand

      const secondClickHandler = mockDisplayEl.on.mock.calls[1][1];
      await secondClickHandler(); // collapse

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const finalHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(finalHtml).not.toContain('aman-display-expanded');
    });

    it('should render alert ticker rows with data-symbol and data-type attributes', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', ticker: 'TVTICKER' }),
        makeAlertTicker({ type: 'SECONDARY', symbol: 'INFY.PA', name: 'Infosys CDR', exchange: 'XPAR', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler();

      const htmlCalls = mockDisplayEl.html.mock.calls;
      const expandedHtml = htmlCalls[htmlCalls.length - 1][0];

      expect(expandedHtml).toContain('aman-display-alert-ticker-row');
      expect(expandedHtml).toContain('data-alert-ticker-symbol="INFY"');
      expect(expandedHtml).toContain('data-alert-ticker-type="PRIMARY"');
      expect(expandedHtml).toContain('data-alert-ticker-symbol="INFY.PA"');
      expect(expandedHtml).toContain('data-alert-ticker-type="SECONDARY"');
    });
  });
});
