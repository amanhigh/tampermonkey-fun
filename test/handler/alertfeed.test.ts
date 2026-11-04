import { AlertFeedHandler } from '../../src/handler/alertfeed';
import { IUIUtil } from '../../src/util/ui';
import { IDisplayManager } from '../../src/manager/display';
import { IAlertManager } from '../../src/manager/alert';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IInvestingManager } from '../../src/manager/investing';
import { AlertTicker } from '../../src/models/barkat/alert/alert_ticker';
import { Instrument } from '../../src/models/integrations/investing';
import { AlertClickAction } from '../../src/models/shared/events';
import { DisplayState } from '../../src/models/presentation/display';
import { ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/barkat/domain_event';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    yellow: jest.fn(),
    message: jest.fn(),
  },
}));

// Import Notifier after mock to get the mocked version
import { Notifier } from '../../src/util/notify';

describe('AlertFeedHandler', () => {
  let handler: AlertFeedHandler;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockDisplayManager: jest.Mocked<IDisplayManager>;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockInvestingManager: jest.Mocked<IInvestingManager>;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'INFY',
    pair_id: '12345',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    type: 'PRIMARY',
    ticker: 'TV:INFY',
    created_at: '',
    updated_at: '',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default $ mock: returns object with text, closest, css, attr, each, hide
    const makeDefaultJQuery = () => ({
      text: jest.fn().mockReturnValue(''),
      closest: jest.fn().mockReturnValue({ attr: jest.fn().mockReturnValue(null) }),
      attr: jest.fn().mockReturnValue(null),
      css: jest.fn().mockReturnThis(),
      hide: jest.fn().mockReturnThis(),
      appendTo: jest.fn().mockReturnThis(),
      each: jest.fn(),
      data: jest.fn(),
      off: jest.fn(),
      on: jest.fn(),
      click: jest.fn(),
    });
    (global as any).$ = jest.fn(() => makeDefaultJQuery());

    // Mock GM
    (global as any).GM = {
      setValue: jest.fn().mockResolvedValue(undefined),
      addValueChangeListener: jest.fn(),
    };

    mockUIUtil = {
      buildArea: jest.fn().mockReturnValue({ appendTo: jest.fn(), css: jest.fn() }),
      buildButton: jest.fn().mockReturnValue({ appendTo: jest.fn() }),
    } as any;

    mockAlertManager = {
      createAlertClickEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDisplayManager = {
      resolve: jest.fn(),
    } as any;

    mockAlertFeedManager = {
      createAlertFeedEvent: jest.fn(),
      createAlertFeedEventsForTicker: jest.fn(),
      createResetFeedEvent: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      fetchAlertTicker: jest.fn(),
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as any;

    mockInvestingManager = {
      getInstrument: jest.fn(),
    } as any;

    handler = new AlertFeedHandler(
      mockUIUtil,
      mockDisplayManager,
      mockAlertManager,
      mockAlertFeedManager,
      mockAlertTickerManager,
      mockInvestingManager
    );
  });

  // ── Registration Tests ──

  describe('registerEvents', () => {
    it('should subscribe to ALERT_TICKER_LINKED via subscribe', () => {
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        DomainEventType.ALERT_TICKER_LINKED,
        expect.any(Function)
      );
    });

    it('should subscribe to ALERT_TICKER_DELETED via subscribe', () => {
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        DomainEventType.ALERT_TICKER_DELETED,
        expect.any(Function)
      );
    });

    it('should use subscribeMany for TickerPayload events (TICKER_CHANGED, TICKER_TRACKING_STARTED, TICKER_TIMEFRAMES_CHANGED)', () => {
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);

      expect(mockConsumer.subscribeMany).toHaveBeenCalledWith(
        [
          DomainEventType.TICKER_CHANGED,
          DomainEventType.TICKER_TRACKING_STARTED,
          DomainEventType.TICKER_TIMEFRAMES_CHANGED,
        ],
        expect.any(Function)
      );
    });

    it('should subscribe to TICKER_CATEGORY_CHANGED via subscribe', () => {
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        DomainEventType.TICKER_CATEGORY_CHANGED,
        expect.any(Function)
      );
    });

    it('should subscribe to WATCHLIST_CHANGED separately', () => {
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);

      expect(mockConsumer.subscribe).toHaveBeenCalledWith(
        DomainEventType.WATCHLIST_CHANGED,
        expect.any(Function)
      );
    });

    it('should create alert feed event directly from linked event alertTicker', async () => {
      let linkedCallback: Function | undefined;
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn((type, cb) => {
          if (type === DomainEventType.ALERT_TICKER_LINKED) {
            linkedCallback = cb;
          }
        }),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);
      await linkedCallback!({ type: DomainEventType.ALERT_TICKER_LINKED, ticker: 'TV:INFY', alertTicker: 'INFY' });

      expect(mockAlertFeedManager.createAlertFeedEvent).toHaveBeenCalledWith('INFY', 'TV:INFY');
    });

    it('should create alert feed event with null ticker for ALERT_TICKER_DELETED', async () => {
      let deleteCallback: Function | undefined;
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn((type, cb) => {
          if (type === DomainEventType.ALERT_TICKER_DELETED) {
            deleteCallback = cb;
          }
        }),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);
      await deleteCallback!({ type: DomainEventType.ALERT_TICKER_DELETED, ticker: '', alertTicker: 'INFY' });

      expect(mockAlertFeedManager.createAlertFeedEvent).toHaveBeenCalledWith('INFY');
    });

    it.each([
      DomainEventType.TICKER_CHANGED,
      DomainEventType.TICKER_TRACKING_STARTED,
      DomainEventType.TICKER_TIMEFRAMES_CHANGED,
    ])('should delegate %s ticker fanout to AlertFeedManager', async (eventType) => {
      let manyCallback: Function | undefined;
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn((_types, cb) => {
          manyCallback = cb;
        }),
      };

      handler.registerEvents(mockConsumer);
      await manyCallback!({ type: eventType, ticker: 'TV:INFY' });

      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenCalledTimes(1);
      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenCalledWith('TV:INFY');
      expect(mockAlertFeedManager.createAlertFeedEvent).not.toHaveBeenCalled();
    });

    it('should delegate each WATCHLIST_CHANGED ticker to AlertFeedManager sequentially', async () => {
      let watchlistCallback: Function | undefined;
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn((type, cb) => {
          if (type === DomainEventType.WATCHLIST_CHANGED) {
            watchlistCallback = cb;
          }
        }),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);
      await watchlistCallback!({ type: DomainEventType.WATCHLIST_CHANGED, tickers: ['TV:INFY', 'TV:TCS'] });

      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenCalledTimes(2);
      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenNthCalledWith(1, 'TV:INFY');
      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenNthCalledWith(2, 'TV:TCS');
    });

    it('should delegate each TICKER_CATEGORY_CHANGED ticker to AlertFeedManager sequentially', async () => {
      let categoryCallback: Function | undefined;
      const mockConsumer: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn((type, cb) => {
          if (type === DomainEventType.TICKER_CATEGORY_CHANGED) {
            categoryCallback = cb;
          }
        }),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockConsumer);
      await categoryCallback!({ type: DomainEventType.TICKER_CATEGORY_CHANGED, tickers: ['TICKER_A', 'TICKER_B'] });

      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenCalledTimes(2);
      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenNthCalledWith(1, 'TICKER_A');
      expect(mockAlertFeedManager.createAlertFeedEventsForTicker).toHaveBeenNthCalledWith(2, 'TICKER_B');
    });
  });

  // ── Click Tests ──

  describe('handleAlertClick', () => {
    it('should resolve identity from existing AlertTicker and emit trusted fields', async () => {
      const alertTicker: AlertTicker = {
        symbol: 'INFY',
        pair_id: '12345',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        type: 'PRIMARY',
        ticker: 'TV:INFY',
        created_at: '',
        updated_at: '',
      };
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(alertTicker);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Infosys (INFY)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/equities/infosys'),
        }),
        preventDefault: jest.fn(),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: false, preventDefault: jest.fn() });

      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'INFY',
        AlertClickAction.OPEN,
        '12345',
        'Infosys Ltd',
        'NSE'
      );
    });

    it('should fallback to instrument API and resolve by ticker first', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 8874,
        url: '/equities/infosys',
        description: 'Infosys Ltd',
        symbol: 'INFY',
        exchange: 'NSE',
      };
      mockInvestingManager.getInstrument.mockResolvedValue(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Infosys (INFY)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('https://in.investing.com/equities/infosys'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      expect(mockAlertTickerManager.fetchAlertTicker).toHaveBeenCalledWith('INFY');
      // Ticker should be tried before the raw alert title
      expect(mockInvestingManager.getInstrument).toHaveBeenCalledWith(
        'INFY',
        'https://in.investing.com/equities/infosys'
      );
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'INFY',
        AlertClickAction.MAP,
        '8874',
        'Infosys Ltd',
        'NSE'
      );
    });

    it('should resolve MAP identity by ticker first for VPL-style alert labels', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 38164,
        url: '/etfs/vanguard-pacific',
        description: 'Vanguard FTSE Pacific Index Fund ETF Shares',
        symbol: 'VPL',
        exchange: 'NYSE',
      };
      mockInvestingManager.getInstrument.mockResolvedValue(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Vanguard FTSE Pacific (VPL)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('https://in.investing.com/etfs/vanguard-pacific'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      // Should try ticker 'VPL' first, not the raw alert title
      expect(mockInvestingManager.getInstrument).toHaveBeenCalledWith(
        'VPL',
        'https://in.investing.com/etfs/vanguard-pacific'
      );
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'VPL',
        AlertClickAction.MAP,
        '38164',
        'Vanguard FTSE Pacific Index Fund ETF Shares',
        'NYSE'
      );
    });

    it('should fallback to clean alert name when ticker query returns no instrument', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 38164,
        url: '/etfs/vanguard-pacific',
        description: 'Vanguard FTSE Pacific Index Fund ETF Shares',
        symbol: 'VPL',
        exchange: 'NYSE',
      };
      // Ticker query returns null, clean name query succeeds
      mockInvestingManager.getInstrument
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Vanguard FTSE Pacific (VPL)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('https://in.investing.com/etfs/vanguard-pacific'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      // First try ticker 'VPL' — returns null
      expect(mockInvestingManager.getInstrument).toHaveBeenNthCalledWith(
        1,
        'VPL',
        'https://in.investing.com/etfs/vanguard-pacific'
      );
      // Then try clean name 'Vanguard FTSE Pacific' — succeeds
      expect(mockInvestingManager.getInstrument).toHaveBeenNthCalledWith(
        2,
        'Vanguard FTSE Pacific',
        'https://in.investing.com/etfs/vanguard-pacific'
      );
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'VPL',
        AlertClickAction.MAP,
        '38164',
        'Vanguard FTSE Pacific Index Fund ETF Shares',
        'NYSE'
      );
    });

    it('should emit fallback OPEN event when no identity can be resolved', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      mockInvestingManager.getInstrument.mockResolvedValue(null);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Unknown (ZZZZZ)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/unknown'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: false, preventDefault: jest.fn() });

      // OPEN fallback emits event with extracted ticker directly
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'ZZZZZ',
        AlertClickAction.OPEN,
        undefined,
        'Unknown (ZZZZZ)'
      );
      expect(Notifier.warn).not.toHaveBeenCalled();
    });

    it('should warn and skip event when MAP action and no identity can be resolved', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      mockInvestingManager.getInstrument.mockResolvedValue(null);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Unknown (ZZZZZ)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/unknown'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      // MAP action still requires trusted identity
      expect(mockAlertManager.createAlertClickEvent).not.toHaveBeenCalled();
      expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('Cannot resolve alert identity'));
    });

    it('should use Ctrl key to determine MAP action', async () => {
      const alertTicker: AlertTicker = {
        symbol: 'TEST',
        pair_id: '999',
        name: 'Test Name',
        exchange: 'NSE',
        type: 'PRIMARY',
        ticker: 'TV:TEST',
        created_at: '',
        updated_at: '',
      };
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(alertTicker);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Test (TEST)'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/test'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'TEST',
        AlertClickAction.MAP,
        '999',
        'Test Name',
        'NSE'
      );
    });

    it('should publish instrument symbol (not raw HTML text) for name-only alerts', async () => {
      mockAlertTickerManager.fetchAlertTicker.mockResolvedValue(null);
      const instrument: Instrument = {
        id: 8874,
        url: '/indices/nq-100-futures',
        description: 'Nasdaq 100 Futures',
        symbol: 'NQ',
        exchange: 'CME',
      };
      mockInvestingManager.getInstrument.mockResolvedValue(instrument);

      const $mock = (global as any).$;
      $mock.mockImplementation(() => ({
        text: jest.fn().mockReturnValue('Nasdaq 100'),
        closest: jest.fn().mockReturnValue({
          attr: jest.fn().mockReturnValue('/indices/nq-100-futures'),
        }),
      }));

      await (handler as any).handleAlertClick({ ctrlKey: true, preventDefault: jest.fn() });

      // alertTicker must be instrument.symbol ('NQ'), not the raw parsed text ('Nasdaq 100')
      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith(
        'NQ',
        AlertClickAction.MAP,
        '8874',
        'Nasdaq 100 Futures',
        'CME'
      );
    });
  });

  // ── Paint Tests ──

  describe('paintAlertFeed', () => {
    /**
     * Build a $ mock that:
     * - When called with a string selector → returns object with `each` plus `css`
     * - When called with an element object → returns the element mock with closest/text/css
     */
    const buildPaintMock = (
      rows: Array<{
        title: string;
        href: string;
        dataType: string;
      }>
    ) => {
      // Create element mocks
      const elementMocks = rows.map((row) => ({
        text: jest.fn().mockReturnValue(row.title),
        closest: jest.fn().mockImplementation((selector: string) => {
          if (selector === 'div.alertWrapper') {
            return { attr: jest.fn().mockReturnValue(row.dataType) };
          }
          return { attr: jest.fn().mockReturnValue(row.href) };
        }),
        css: jest.fn().mockReturnThis(),
        hide: jest.fn().mockReturnThis(),
      }));

      // Create the outer jQuery mock for selector calls
      const outerMock = {
        each: jest.fn((callback: Function) => {
          elementMocks.forEach((el, i) => callback(i, el));
        }),
        css: jest.fn().mockReturnThis(),
        hide: jest.fn().mockReturnThis(),
      };

      // $() returns outerMock for string selectors, element mock for element args
      (global as any).$.mockImplementation((arg: any) => {
        if (typeof arg === 'string') {
          return outerMock;
        }
        // Called with element — return the corresponding element mock
        const idx = elementMocks.indexOf(arg);
        if (idx >= 0) {
          return arg;
        }
        // Fallback to first element mock
        return elementMocks[0] || { css: jest.fn().mockReturnThis(), hide: jest.fn().mockReturnThis() };
      });

      return { outerMock, elementMocks };
    };

    it('should paint symbol-in-parentheses row via AlertTicker.symbol', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'INFY', name: 'Infosys Ltd', ticker: 'TV:INFY' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({
        state: DisplayState.DEFAULT,
        color: 'white',
      });

      buildPaintMock([{ title: 'Infosys (INFY)', href: '/equities/infosys', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(alertTickers[0].ticker);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should paint slash-symbol row via AlertTicker.symbol', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'XAG/USD', name: 'Silver Spot US Dollar', ticker: 'XAGUSD' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({
        state: DisplayState.DEFAULT,
        color: 'white',
      });

      buildPaintMock([{ title: 'XAG/USD', href: '/currencies/xag-usd', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(alertTickers[0].ticker);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should paint no-symbol row via exact AlertTicker.name', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'Nifty500', name: 'Nifty 500', ticker: 'CNX500' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({
        state: DisplayState.DEFAULT,
        color: 'white',
      });

      buildPaintMock([{ title: 'Nifty 500', href: '/indices/s-p-cnx-500', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(alertTickers[0].ticker);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should paint no-symbol row via unique prefix match', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'NQ', name: 'Nasdaq 100 Futures', ticker: 'NQ1!' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({
        state: DisplayState.DEFAULT,
        color: 'white',
      });

      buildPaintMock([{ title: 'Nasdaq 100', href: '/indices/nq-100-futures', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(alertTickers[0].ticker);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should paint no-symbol row via unique contains match', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'CrudeOilWTI', name: 'Crude Oil WTI Futures', ticker: 'USOIL' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({
        state: DisplayState.DEFAULT,
        color: 'white',
      });

      buildPaintMock([{ title: 'WTI', href: '/commodities/crude-oil', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockAlertTickerManager.getAlertTickers).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(alertTickers[0].ticker);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should leave ambiguous fallback unmapped and warn', async () => {
      const alertTickers = [
        makeAlertTicker({ symbol: 'Nifty500', name: 'Nifty 500', ticker: 'CNX500' }),
        makeAlertTicker({ symbol: 'NSEI', name: 'Nifty 50', ticker: 'NIFTY' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      buildPaintMock([{ title: 'Nifty', href: '/indices/nifty', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
      expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('Unmapped'));
    });

    it('should skip economic-calendar rows', async () => {
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([]);

      buildPaintMock([{ title: 'India GDP', href: '/economic-calendar/indian-gdp', dataType: 'ec' }]);

      await handler.paintAlertFeed();

      expect(mockDisplayManager.resolve).not.toHaveBeenCalled();
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
      expect(Notifier.warn).not.toHaveBeenCalled();
    });

    it('should not call InvestingManager.getInstrument during repaint and delegate unmapped to manager', async () => {
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([]);
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      buildPaintMock([{ title: 'Unknown (ZZZZZ)', href: '/unknown', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
    });

    it('should resolve mapped-but-not-in-silo ticker as DEFAULT/white, not as unmapped', async () => {
      // Backend has GRINDWELL mapped under symbol GRNN
      const alertTickers = [
        makeAlertTicker({ symbol: 'GRNN', name: 'Grindwell Norton', ticker: 'GRINDWELL' }),
      ];
      mockAlertTickerManager.getAlertTickers.mockResolvedValue(alertTickers);
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.DEFAULT, color: 'white' });

      buildPaintMock([{ title: 'Grindwell Norton (GRNN)', href: '/equities/grindwell-norton', dataType: 'quotes' }]);

      await handler.paintAlertFeed();

      // Should resolve with the mapped TV ticker, not null
      expect(mockDisplayManager.resolve).toHaveBeenCalledWith('GRINDWELL');
      expect(mockInvestingManager.getInstrument).not.toHaveBeenCalled();
      expect(Notifier.warn).not.toHaveBeenCalled();
    });
  });
});
