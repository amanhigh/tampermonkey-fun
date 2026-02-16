import { TickerManager, ITickerManager } from '../../src/manager/ticker';
import { IWaitUtil } from '../../src/util/wait';
import { ISymbolManager } from '../../src/manager/symbol';
import { ITradingViewScreenerManager } from '../../src/manager/screener';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { Constants } from '../../src/models/constant';

// Mock jQuery globally
(global as any).$ = jest.fn(() => ({
  text: jest.fn(),
}));

describe('TickerManager', () => {
  let tickerManager: ITickerManager;
  let mockWaitUtil: jest.Mocked<IWaitUtil>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
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

    // Mock SymbolManager
    mockSymbolManager = {
      kiteToTv: jest.fn(),
      tvToKite: jest.fn(),
      tvToInvesting: jest.fn(),
      investingToTv: jest.fn(),
      tvToExchangeTicker: jest.fn(),
      createTvToInvestingMapping: jest.fn(),
      removeTvToInvestingMapping: jest.fn(),
      createTvToExchangeTickerMapping: jest.fn(),
      isComposite: jest.fn(),
      removeTvToExchangeTickerMapping: jest.fn(),
      deleteTvTicker: jest.fn(),
    };

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

    tickerManager = new TickerManager(mockWaitUtil, mockSymbolManager, mockScreenerManager, mockWatchlistManager);
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

    it('should throw error when ticker is null', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(null),
      });

      expect(() => tickerManager.getTicker()).toThrow('Ticker not found');
    });
  });

  describe('getCurrentExchange', () => {
    it('should return exchange from DOM', () => {
      const mockExchange = 'NSE';
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(mockExchange),
      });

      const result = tickerManager.getCurrentExchange();

      expect((global as any).$).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);
      expect(result).toBe(mockExchange);
    });

    it('should throw error when exchange not found', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(''),
      });

      expect(() => tickerManager.getCurrentExchange()).toThrow('Exchange not found');
    });
  });

  describe('getInvestingTicker', () => {
    it('should return investing ticker for valid TV ticker', () => {
      const tvTicker = 'HDFC';
      const investingTicker = 'hdfc-bank';

      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(tvTicker),
      });
      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);

      const result = tickerManager.getInvestingTicker();

      expect(mockSymbolManager.tvToInvesting).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(investingTicker);
    });

    it('should throw error when investing ticker not found', () => {
      const tvTicker = 'UNKNOWN';

      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(tvTicker),
      });
      mockSymbolManager.tvToInvesting.mockReturnValue(null);

      expect(() => tickerManager.getInvestingTicker()).toThrow(`Investing ticker not found for ${tvTicker}`);
    });

    it('should handle getTicker throwing error', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(''),
      });

      expect(() => tickerManager.getInvestingTicker()).toThrow('Ticker not found');
    });
  });

  describe('openTicker', () => {
    it('should open ticker with exchange formatting', () => {
      const ticker = 'HDFC';
      const exchangeTicker = 'NSE:HDFC';

      mockSymbolManager.tvToExchangeTicker.mockReturnValue(exchangeTicker);

      tickerManager.openTicker(ticker);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith(ticker);
      expect(mockWaitUtil.waitClick).toHaveBeenCalledWith(Constants.DOM.BASIC.TICKER);
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, exchangeTicker);
    });

    it('should handle special characters in ticker', () => {
      const ticker = 'M&M';
      const exchangeTicker = 'NSE:M&M';

      mockSymbolManager.tvToExchangeTicker.mockReturnValue(exchangeTicker);

      tickerManager.openTicker(ticker);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith(ticker);
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, exchangeTicker);
    });
  });

  describe('getSelectedTickers', () => {
    beforeEach(() => {
      // Mock getTicker for fallback behavior
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('CURRENT_TICKER'),
      });
    });

    it('should return screener tickers when screener is visible and has enough tickers', () => {
      const screenTickers = ['HDFC', 'RELIANCE'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getSelectedTickers.mockReturnValue(screenTickers);

      const result = tickerManager.getSelectedTickers();

      expect(mockScreenerManager.isScreenerVisible).toHaveBeenCalled();
      expect(mockScreenerManager.getSelectedTickers).toHaveBeenCalled();
      expect(result).toEqual(screenTickers);
    });

    it('should return watchlist tickers when screener is not visible and has enough tickers', () => {
      const watchlistTickers = ['HDFC', 'RELIANCE'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(false);
      mockWatchlistManager.getSelectedTickers.mockReturnValue(watchlistTickers);

      const result = tickerManager.getSelectedTickers();

      expect(mockScreenerManager.isScreenerVisible).toHaveBeenCalled();
      expect(mockWatchlistManager.getSelectedTickers).toHaveBeenCalled();
      expect(result).toEqual(watchlistTickers);
    });

    it('should return current ticker when not enough selected tickers available', () => {
      const singleTicker = ['HDFC'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(false);
      mockWatchlistManager.getSelectedTickers.mockReturnValue(singleTicker);

      // Mock getTicker to return 'TCS'
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('TCS'),
      });

      const result = tickerManager.getSelectedTickers();

      expect(result).toEqual(['TCS']);
    });

    it('should return current ticker when no tickers available', () => {
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getSelectedTickers.mockReturnValue([]);

      // Mock getTicker to return 'CURRENT_TICKER'
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('CURRENT_TICKER'),
      });

      const result = tickerManager.getSelectedTickers();

      expect(result).toEqual(['CURRENT_TICKER']);
    });
  });

  describe('openBenchmarkTicker', () => {
    beforeEach(() => {
      // Mock getTicker and getCurrentExchange
      ((global as any).$ as jest.Mock).mockImplementation((selector: string) => {
        if (selector === Constants.DOM.BASIC.TICKER) {
          return { text: jest.fn().mockReturnValue('HDFC') };
        } else if (selector === Constants.DOM.BASIC.EXCHANGE) {
          return { text: jest.fn().mockReturnValue('NSE') };
        }
        return { text: jest.fn() };
      });

      mockSymbolManager.tvToExchangeTicker.mockImplementation((ticker) => ticker);
    });

    it('should open MCX benchmark ticker', () => {
      ((global as any).$ as jest.Mock).mockImplementation((selector: string) => {
        if (selector === Constants.DOM.BASIC.TICKER) {
          return { text: jest.fn().mockReturnValue('GOLD') };
        } else if (selector === Constants.DOM.BASIC.EXCHANGE) {
          return { text: jest.fn().mockReturnValue('MCX') };
        }
        return { text: jest.fn() };
      });

      tickerManager.openBenchmarkTicker();

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('GOLD/MCX:GOLD1!');
    });

    it('should open NSE benchmark ticker', () => {
      // Constants.EXCHANGE.TYPES.NSE is likely 'NSE', so let's test with that
      ((global as any).$ as jest.Mock).mockImplementation((selector: string) => {
        if (selector === Constants.DOM.BASIC.TICKER) {
          return { text: jest.fn().mockReturnValue('HDFC') };
        } else if (selector === Constants.DOM.BASIC.EXCHANGE) {
          return { text: jest.fn().mockReturnValue('NSE') }; // Assuming NSE constant
        }
        return { text: jest.fn() };
      });

      tickerManager.openBenchmarkTicker();

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('HDFC/NIFTY');
    });

    it('should open BINANCE benchmark ticker', () => {
      ((global as any).$ as jest.Mock).mockImplementation((selector: string) => {
        if (selector === Constants.DOM.BASIC.TICKER) {
          return { text: jest.fn().mockReturnValue('BTCUSDT') };
        } else if (selector === Constants.DOM.BASIC.EXCHANGE) {
          return { text: jest.fn().mockReturnValue('BINANCE') };
        }
        return { text: jest.fn() };
      });

      tickerManager.openBenchmarkTicker();

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('BTCUSDT/BINANCE:BTCUSDT');
    });

    it('should open default benchmark ticker for unknown exchange', () => {
      ((global as any).$ as jest.Mock).mockImplementation((selector: string) => {
        if (selector === Constants.DOM.BASIC.TICKER) {
          return { text: jest.fn().mockReturnValue('AAPL') };
        } else if (selector === Constants.DOM.BASIC.EXCHANGE) {
          return { text: jest.fn().mockReturnValue('NASDAQ') };
        }
        return { text: jest.fn() };
      });

      tickerManager.openBenchmarkTicker();

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('AAPL/XAUUSD');
    });
  });

  describe('navigateTickers', () => {
    beforeEach(() => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('HDFC'),
      });
      mockSymbolManager.tvToExchangeTicker.mockImplementation((ticker) => ticker);
    });

    it('should navigate forward in screener tickers', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(tickers);

      tickerManager.navigateTickers(1);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockWaitUtil.waitClick).toHaveBeenCalledWith(Constants.DOM.BASIC.TICKER);
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'RELIANCE');
    });

    it('should navigate backward in watchlist tickers', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(false);
      mockWatchlistManager.getTickers.mockReturnValue(tickers);

      tickerManager.navigateTickers(-1);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('TCS'); // Wraparound to last
    });

    it('should wrap around to beginning when navigating forward from last ticker', () => {
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('TCS'), // Current is last ticker
      });

      const tickers = ['HDFC', 'RELIANCE', 'TCS'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(tickers);

      tickerManager.navigateTickers(1);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('HDFC'); // Wraparound to first
    });

    it('should wrap around to end when navigating backward from first ticker', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(tickers);

      tickerManager.navigateTickers(-1);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('TCS'); // Wraparound to last
    });

    it('should handle multi-step navigation', () => {
      const tickers = ['A', 'B', 'C', 'D', 'E'];
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('B'), // Current is second ticker
      });

      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(tickers);

      tickerManager.navigateTickers(2); // Move forward 2 steps

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('D'); // B -> C -> D
    });

    it('should throw error when no visible tickers available', () => {
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue([]);

      expect(() => tickerManager.navigateTickers(1)).toThrow('No visible tickers available for navigation');
    });

    it('should handle ticker not found in current list', () => {
      const tickers = ['RELIANCE', 'TCS', 'WIPRO'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(tickers);

      // Current ticker 'HDFC' is not in the list, indexOf returns -1
      tickerManager.navigateTickers(1);

      // -1 + 1 = 0, so should select first ticker
      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('RELIANCE');
    });
  });

  describe('private method integration', () => {
    it('should use screener when screener is visible for getSelectedTickers', () => {
      const screenTickers = ['HDFC', 'RELIANCE'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getSelectedTickers.mockReturnValue(screenTickers);

      // Access private method through public interface
      const result = tickerManager.getSelectedTickers();

      expect(mockScreenerManager.isScreenerVisible).toHaveBeenCalled();
      expect(mockScreenerManager.getSelectedTickers).toHaveBeenCalled();
      expect(mockWatchlistManager.getSelectedTickers).not.toHaveBeenCalled();
      expect(result).toEqual(screenTickers);
    });

    it('should use watchlist when screener is not visible for getSelectedTickers', () => {
      const watchlistTickers = ['HDFC', 'RELIANCE'];
      mockScreenerManager.isScreenerVisible.mockReturnValue(false);
      mockWatchlistManager.getSelectedTickers.mockReturnValue(watchlistTickers);

      const result = tickerManager.getSelectedTickers();

      expect(mockScreenerManager.isScreenerVisible).toHaveBeenCalled();
      expect(mockWatchlistManager.getSelectedTickers).toHaveBeenCalled();
      expect(mockScreenerManager.getSelectedTickers).not.toHaveBeenCalled();
      expect(result).toEqual(watchlistTickers);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle jQuery selector failure gracefully', () => {
      ((global as any).$ as jest.Mock).mockImplementation(() => {
        throw new Error('jQuery selector failed');
      });

      expect(() => tickerManager.getTicker()).toThrow('jQuery selector failed');
    });

    it('should handle symbol manager returning null', () => {
      const ticker = 'UNKNOWN';
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue(ticker),
      });
      mockSymbolManager.tvToExchangeTicker.mockReturnValue(null as any);

      expect(() => tickerManager.openTicker(ticker)).not.toThrow();
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, null);
    });

    it('should handle empty ticker lists gracefully', () => {
      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue([]);

      expect(() => tickerManager.navigateTickers(1)).toThrow('No visible tickers available for navigation');
    });

    it('should handle single ticker in navigation', () => {
      const singleTicker = ['HDFC'];
      ((global as any).$ as jest.Mock).mockReturnValue({
        text: jest.fn().mockReturnValue('HDFC'),
      });

      mockScreenerManager.isScreenerVisible.mockReturnValue(true);
      mockScreenerManager.getTickers.mockReturnValue(singleTicker);
      mockSymbolManager.tvToExchangeTicker.mockReturnValue('HDFC');

      // Should stay on the same ticker regardless of step
      tickerManager.navigateTickers(1);
      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('HDFC');

      tickerManager.navigateTickers(-1);
      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('HDFC');
    });
  });
});
