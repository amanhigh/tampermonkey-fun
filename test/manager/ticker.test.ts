import { DomManager, IDomManager } from '../../src/manager/dom';
import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { IWaitUtil } from '../../src/util/wait';
import { ITickerManager } from '../../src/manager/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { Constants } from '../../src/models/constant';
import { Ticker } from '../../src/models/ticker';

// Mock jQuery globally
const mockTextFn = jest.fn();

/**
 * Default mock jQuery element with all methods DomManager needs.
 * Tests override specific methods/selectors via mockReturnValue as needed.
 */
function makeJQMock(overrides: Record<string, any> = {}): any {
  return {
    text: mockTextFn,
    toArray: jest.fn().mockReturnValue([]),
    is: jest.fn().mockReturnValue(false),
    length: 0,
    ...overrides,
  };
}
(global as any).$ = jest.fn(() => makeJQMock());

describe('DomManager', () => {
  let tickerManager: IDomManager;
  let mockWaitUtil: jest.Mocked<IWaitUtil>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WaitUtil
    mockWaitUtil = {
      waitEE: jest.fn(),
      waitJEE: jest.fn(),
      waitClick: jest.fn(),
      waitInput: jest.fn(),
      waitJClick: jest.fn(),
      waitJInput: jest.fn(),
    } as unknown as jest.Mocked<IWaitUtil>;

    // Mock TickerManager
    mockTickerManager = {
      getTicker: jest.fn(),
      startTracking: jest.fn(),
      updateTicker: jest.fn(),
      markRecent: jest.fn(),
      stopTracking: jest.fn(),
      listTickers: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    // Mock AlertTickerManager
    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
    } as unknown as jest.Mocked<IAlertTickerManager>;

    tickerManager = new DomManager(mockWaitUtil, mockTickerManager, mockAlertTickerManager);
  });

  describe('getTicker', () => {
    it('should return ticker from DOM', () => {
      const mockTicker = 'HDFC';
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(mockTicker),
      });

      const result = tickerManager.getTicker();

      expect((global as any).$).toHaveBeenCalledWith(Constants.DOM.BASIC.TICKER);
      expect(result).toBe(mockTicker);
    });

    it('should throw error when ticker not found', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(''),
      });

      expect(() => tickerManager.getTicker()).toThrow('Ticker not found');
    });
  });

  describe('getTickers', () => {
    it('should return watchlist all tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([
          { textContent: 'A' },
          { textContent: 'B' },
        ]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(result).toEqual(new Set(['A', 'B']));
    });

    it('should return watchlist visible tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([
          { textContent: 'X' },
        ]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.VISIBLE);
      expect(result).toEqual(new Set(['X']));
    });

    it('should return watchlist selected tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([
          { textContent: 'SEL' },
        ]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.SELECTED);
      expect(result).toEqual(new Set(['SEL']));
    });

    it('should return screener all tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([
          { textContent: 'S1' },
          { textContent: 'S2' },
          { textContent: 'S3' },
        ]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.SCREENER, TickerVisibility.ALL);
      expect(result).toEqual(new Set(['S1', 'S2', 'S3']));
    });

    it('should return screener visible tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([
          { textContent: 'V1' },
        ]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.SCREENER, TickerVisibility.VISIBLE);
      expect(result).toEqual(new Set(['V1']));
    });

    it('should return screener selected tickers', () => {
      const mockEl = makeJQMock({
        toArray: jest.fn().mockReturnValue([]),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      const result = tickerManager.getTickers(TickerArea.SCREENER, TickerVisibility.SELECTED);
      expect(result).toEqual(new Set());
    });

  });

  describe('isScreenerVisible', () => {
    it('should return true when screener exists and is visible', () => {
      const mockEl = makeJQMock({
        length: 1,
        is: jest.fn().mockReturnValue(true),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      expect(tickerManager.isScreenerVisible()).toBe(true);
      expect((global as any).$).toHaveBeenCalledWith(TickerArea.SCREENER.mainSelector);
    });

    it('should return false when screener element length is 0', () => {
      const mockEl = makeJQMock({
        length: 0,
        is: jest.fn().mockReturnValue(true),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      expect(tickerManager.isScreenerVisible()).toBe(false);
    });

    it('should return false when screener is not visible', () => {
      const mockEl = makeJQMock({
        length: 1,
        is: jest.fn().mockReturnValue(false),
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      expect(tickerManager.isScreenerVisible()).toBe(false);
    });
  });

  describe('openTicker', () => {
    it('should qualify ticker with exchange from backend and navigate', async () => {
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'NSE:RELIANCE' } as Ticker);

      await tickerManager.openTicker('RELIANCE');

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockWaitUtil.waitClick).toHaveBeenCalledWith(Constants.DOM.BASIC.TICKER);
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'NSE:RELIANCE');
    });

    it('should fall back to raw ticker when backend lookup fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      await tickerManager.openTicker('UNKNOWN');

      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'UNKNOWN');
    });

  });

  describe('navigateTickers', () => {
    it('should navigate to next ticker', async () => {
      const mockEl = makeJQMock({
        text: jest.fn().mockReturnValue('A'),
        toArray: jest.fn().mockReturnValue([
          { textContent: 'A' },
          { textContent: 'B' },
          { textContent: 'C' },
        ]),
        is: jest.fn().mockReturnValue(true),
        length: 3,
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'B' } as Ticker);

      await tickerManager.navigateTickers(1);

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('B');
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'B');
    });

    it('should wrap forward at end of ticker list', async () => {
      const mockEl = makeJQMock({
        text: jest.fn().mockReturnValue('C'),
        toArray: jest.fn().mockReturnValue([
          { textContent: 'A' },
          { textContent: 'B' },
          { textContent: 'C' },
        ]),
        is: jest.fn().mockReturnValue(true),
        length: 3,
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'A' } as Ticker);

      await tickerManager.navigateTickers(1);

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('A');
    });

    it('should throw when no visible tickers', async () => {
      const mockEl = makeJQMock({
        text: jest.fn().mockReturnValue('A'),
        toArray: jest.fn().mockReturnValue([]),
        is: jest.fn().mockReturnValue(true),
        length: 0,
      });
      ((global as any).$ as jest.Mock).mockReturnValue(mockEl);

      await expect(tickerManager.navigateTickers(1)).rejects.toThrow('No visible tickers available for navigation');
    });
  });

  describe('openBenchmarkTicker', () => {
    it('should open benchmark relative ticker for NSE', async () => {
      const textMock = jest.fn()
        .mockReturnValueOnce('RELIANCE')   // getTicker
        .mockReturnValueOnce('NSE');        // getCurrentExchange
      ((global as any).$ as jest.Mock).mockReturnValue({ text: textMock });
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'RELIANCE/NIFTY' } as Ticker);

      await tickerManager.openBenchmarkTicker();

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('RELIANCE/NIFTY');
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'RELIANCE/NIFTY');
    });

    it('should open GOLD1 benchmark for MCX', async () => {
      const textMock = jest.fn()
        .mockReturnValueOnce('GOLD')    // getTicker
        .mockReturnValueOnce('MCX');     // getCurrentExchange
      ((global as any).$ as jest.Mock).mockReturnValue({ text: textMock });
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'GOLD/MCX:GOLD1!' } as Ticker);

      await tickerManager.openBenchmarkTicker();

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('GOLD/MCX:GOLD1!');
    });

    it('should open BTC benchmark for BINANCE', async () => {
      const textMock = jest.fn()
        .mockReturnValueOnce('BTCUSDT')
        .mockReturnValueOnce('BINANCE');
      ((global as any).$ as jest.Mock).mockReturnValue({ text: textMock });
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'BTCUSDT/BINANCE:BTCUSDT' } as Ticker);

      await tickerManager.openBenchmarkTicker();

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('BTCUSDT/BINANCE:BTCUSDT');
    });

    it('should default to XAUUSD benchmark for unknown exchanges', async () => {
      const textMock = jest.fn()
        .mockReturnValueOnce('GOLD')
        .mockReturnValueOnce('FOREX');
      ((global as any).$ as jest.Mock).mockReturnValue({ text: textMock });
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'GOLD/XAUUSD' } as Ticker);

      await tickerManager.openBenchmarkTicker();

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('GOLD/XAUUSD');
    });
  });

  describe('getCurrentExchange', () => {
    it('should return exchange from DOM', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('NSE'),
      });

      const result = tickerManager.getCurrentExchange();

      expect((global as any).$).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);
      expect(result).toBe('NSE');
    });

    it('should throw when exchange not found', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(''),
      });

      expect(() => tickerManager.getCurrentExchange()).toThrow('Exchange not found');
    });
  });

  describe('getInvestingTicker', () => {
    it('should return first alert ticker symbol', async () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('TV:HDFC'),
      });
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue({
        symbol: 'HDFC',
        pair_id: '123',
        name: 'HDFC Bank',
        exchange: 'NSE',
        type: 'SECONDARY',
        ticker: 'TV:HDFC',
        created_at: '',
        updated_at: '',
      });

      const result = await tickerManager.getInvestingTicker();

      expect(mockAlertTickerManager.getPrimaryAlertTicker).toHaveBeenCalledWith('TV:HDFC');
      expect(result).toBe('HDFC');
    });

    it('should throw when no alert ticker found', async () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('TV:UNKNOWN'),
      });
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);

      await expect(tickerManager.getInvestingTicker()).rejects.toThrow('Investing ticker not found for TV:UNKNOWN');
    });
  });
});
