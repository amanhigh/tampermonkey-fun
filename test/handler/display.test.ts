import { DisplayHandler, IDisplayHandler } from '../../src/handler/display';
import { ISequenceManager } from '../../src/manager/sequence';
import { IDomManager } from '../../src/manager/dom';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';
import { SequenceType } from '../../src/models/trading';

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
  let handler: IDisplayHandler;
  let mockSequenceManager: jest.Mocked<ISequenceManager>;
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

    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockResolvedValue(SequenceType.MWD),
      flipSequence: jest.fn(),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn(),
    } as any;

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

    handler = new DisplayHandler(mockSequenceManager, mockDomManager, mockAlertTickerManager);
  });

  describe('display', () => {
    it('should render compact mapped display with primary ticker, sequence, and alert count', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' }),
      ]);

      await handler.display();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TVTICKER');

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

      await handler.display();

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

      await handler.display();

      expect(mockDisplayEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-mapped');
    });

    it('should set unmapped css class when ticker is unmapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockDisplayEl.addClass).toHaveBeenCalledWith('aman-display-unmapped');
    });

    it('should attach click handler to display element', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockDisplayEl.off).toHaveBeenCalledWith('click');
      expect(mockDisplayEl.on).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('expanded display toggle', () => {
    it('should render expanded rows with primary and secondary tickers on click', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
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
      expect(expandedHtml).toContain('MWD');
      expect(expandedHtml).toContain('🔔2');
      expect(expandedHtml).toContain('⭐');
      expect(expandedHtml).toContain('INFY');
      expect(expandedHtml).toContain('Infosys Ltd');
      expect(expandedHtml).toContain('🔹');
      expect(expandedHtml).toContain('INFY.PA');
      expect(expandedHtml).toContain('Infosys CDR');
    });

    it('should render unmapped expanded empty state on click', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

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
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
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

  describe('resetExpanded', () => {
    it('should reset expanded state to compact for next render', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();
      const clickHandler = mockDisplayEl.on.mock.calls[0][1];
      await clickHandler(); // expanded

      handler.resetExpanded();

      // Next display should be compact
      await handler.display();
      const htmlCalls = mockDisplayEl.html.mock.calls;
      const finalHtml = htmlCalls[htmlCalls.length - 1][0];
      expect(finalHtml).not.toContain('aman-display-expanded');
    });
  });
});
