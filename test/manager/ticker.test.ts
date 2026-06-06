import { DomManager, IDomManager } from '../../src/manager/dom';
import { IWaitUtil } from '../../src/util/wait';
import { ITickerManager } from '../../src/manager/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ITradingViewScreenerManager } from '../../src/manager/screener';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { Constants } from '../../src/models/constant';
import { Ticker } from '../../src/models/ticker';

// Mock jQuery globally
const mockTextFn = jest.fn();
(global as any).$ = jest.fn(() => ({
  text: mockTextFn,
}));

describe('DomManager', () => {
  let tickerManager: IDomManager;
  let mockWaitUtil: jest.Mocked<IWaitUtil>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockScreenerManager: jest.Mocked<ITradingViewScreenerManager>;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;

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
      getAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as unknown as jest.Mocked<IAlertTickerManager>;

    // Mock ScreenerManager
    mockScreenerManager = {
      getTickers: jest.fn(),
      getSelectedTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
      navigateToTicker: jest.fn(),
      selectAllTickers: jest.fn(),
      deselectAllTickers: jest.fn(),
      invertSelection: jest.fn(),
      paintTickers: jest.fn(),
    } as unknown as jest.Mocked<ITradingViewScreenerManager>;

    // Mock WatchlistManager
    mockWatchlistManager = {
      getTickers: jest.fn(),
      getSelectedTickers: jest.fn(),
      navigateToTicker: jest.fn(),
      selectAllTickers: jest.fn(),
      deselectAllTickers: jest.fn(),
      invertSelection: jest.fn(),
      paintTickers: jest.fn(),
      deleteTickers: jest.fn(),
      filterTickers: jest.fn(),
      getCurrentWatchlist: jest.fn(),
      switchWatchlist: jest.fn(),
    } as unknown as jest.Mocked<ITradingViewWatchlistManager>;

    tickerManager = new DomManager(mockWaitUtil, mockTickerManager, mockAlertTickerManager, mockScreenerManager, mockWatchlistManager);
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

  describe('getSelectedTickers', () => {
    it('should return ticker from screener when visible', () => {
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getSelectedTickers.mockReturnValue(['A', 'B', 'C']);
      const result = tickerManager.getSelectedTickers();
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should fallback to single ticker when too few selected', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('SOLO'),
      });
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getSelectedTickers.mockReturnValue(['A']);

      const result = tickerManager.getSelectedTickers();
      expect(result).toEqual(['SOLO']);
    });
  });

  describe('navigateTickers', () => {
    it('should navigate to next ticker', async () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('A'),
      });
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(['A', 'B', 'C']);
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'B' } as Ticker);

      await tickerManager.navigateTickers(1);

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('B');
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'B');
    });

    it('should wrap forward at end of ticker list', async () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('C'),
      });
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(['A', 'B', 'C']);
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'A' } as Ticker);

      await tickerManager.navigateTickers(1);

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('A');
    });

    it('should throw when no visible tickers', async () => {
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue([]);

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
      mockAlertTickerManager.getAlertTicker.mockResolvedValue({
        symbol: 'HDFC',
        pair_id: '123',
        name: 'HDFC Bank',
        exchange: 'NSE',
        ticker: 'TV:HDFC',
        created_at: '',
        updated_at: '',
      });

      const result = await tickerManager.getInvestingTicker();

      expect(mockAlertTickerManager.getAlertTicker).toHaveBeenCalledWith('TV:HDFC');
      expect(result).toBe('HDFC');
    });

    it('should throw when no alert ticker found', async () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('TV:UNKNOWN'),
      });
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(null);

      await expect(tickerManager.getInvestingTicker()).rejects.toThrow('Investing ticker not found for TV:UNKNOWN');
    });
  });
});
