import { TickerManager, ITickerManager } from '../../src/manager/ticker';
import { IWaitUtil } from '../../src/util/wait';
import { ISymbolManager } from '../../src/manager/symbol';
import { ITradingViewScreenerManager } from '../../src/manager/screener';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { Constants } from '../../src/models/constant';

// Mock jQuery globally
const mockTextFn = jest.fn();
(global as any).$ = jest.fn(() => ({
  text: mockTextFn,
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
      tvToExchangeTicker: jest.fn().mockResolvedValue('EXCHANGE_TICKER'),
      createTvToInvestingMapping: jest.fn(),
      removeTvToInvestingMapping: jest.fn(),
      setExchange: jest.fn().mockResolvedValue(undefined),
      isComposite: jest.fn(),
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
  });

  describe('openTicker', () => {
    it('should qualify ticker with exchange and navigate', async () => {
      mockSymbolManager.tvToExchangeTicker.mockResolvedValue('NSE:RELIANCE');
      mockWaitUtil.waitClick = jest.fn();
      mockWaitUtil.waitInput = jest.fn();

      await tickerManager.openTicker('RELIANCE');

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockWaitUtil.waitClick).toHaveBeenCalledWith(Constants.DOM.BASIC.TICKER);
      expect(mockWaitUtil.waitInput).toHaveBeenCalledWith(Constants.DOM.POPUPS.SEARCH, 'NSE:RELIANCE');
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
      mockSymbolManager.tvToExchangeTicker.mockResolvedValue('B');

      await tickerManager.navigateTickers(1);

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('B');
    });
  });

  describe('openBenchmarkTicker', () => {
    it('should open benchmark relative ticker for NSE', async () => {
      // getTicker() and getCurrentExchange() both read from DOM
      // First call (getTicker) returns ticker, second call (getCurrentExchange) returns exchange
      const textMock = jest.fn()
        .mockReturnValueOnce('RELIANCE')   // getTicker
        .mockReturnValueOnce('NSE');        // getCurrentExchange
      ((global as any).$ as jest.Mock).mockReturnValue({ text: textMock });

      await tickerManager.openBenchmarkTicker();

      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('RELIANCE/NIFTY');
    });
  });
});
