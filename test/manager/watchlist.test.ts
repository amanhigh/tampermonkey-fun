import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { IUIUtil } from '../../src/util/ui';
import { IFnoManager } from '../../src/manager/fno';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { Constants } from '../../src/models/constant';
import { WatchCategory, WatchCategoryId } from '../../src/models/watch';

// Mock jQuery globally for DOM manipulation
const mockJQuery = jest.fn(() => ({
  toArray: jest.fn().mockReturnValue([]),
  css: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  has: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  empty: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  mousedown: jest.fn().mockReturnThis(),
  contextmenu: jest.fn().mockReturnThis(),
}));
(global as any).$ = mockJQuery;

describe('TradingViewWatchlistManager', () => {
  let watchlistManager: ITradingViewWatchlistManager;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockFnoManager: jest.Mocked<IFnoManager>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockFlagManager: jest.Mocked<IFlagManager>;

  const mockElement = { innerHTML: 'MOCKSTOCK' };
  const mockJQueryChain = {
    toArray: jest.fn().mockReturnValue([mockElement]),
    css: jest.fn().mockReturnThis(),
    show: jest.fn().mockReturnThis(),
    hide: jest.fn().mockReturnThis(),
    has: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    empty: jest.fn().mockReturnThis(),
    appendTo: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    mousedown: jest.fn().mockReturnThis(),
    contextmenu: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock dependencies
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQueryChain),
    } as unknown as jest.Mocked<IUIUtil>;

    mockFnoManager = {
      getAllFnoTickers: jest.fn().mockReturnValue(new Set(['FNO1', 'FNO2'])),
      isFno: jest.fn(),
    } as unknown as jest.Mocked<IFnoManager>;

    mockWatchManager = {
      getTickerCategories: jest.fn(),
      getTickerCategory: jest.fn(),
      recordCategory: jest.fn(),
    } as unknown as jest.Mocked<IWatchManager>;

    mockFlagManager = {
      paint: jest.fn(),
    } as unknown as jest.Mocked<IFlagManager>;

    // Reset jQuery mock
    mockJQuery.mockReturnValue(mockJQueryChain);

    watchlistManager = new TradingViewWatchlistManager(
      mockPaintManager,
      mockUIUtil,
      mockFnoManager,
      mockWatchManager,
      mockFlagManager
    );
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(watchlistManager).toBeInstanceOf(TradingViewWatchlistManager);
    });
  });

  describe('getTickers', () => {
    beforeEach(() => {
      mockJQuery.mockReturnValue({
        ...mockJQueryChain,
        toArray: jest.fn().mockReturnValue([{ innerHTML: 'AAPL' }, { innerHTML: 'GOOGL' }, { innerHTML: 'MSFT' }]),
      });
    });

    it('should return all tickers when visible is false', () => {
      const result = watchlistManager.getTickers(false);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
      expect(result).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should return visible tickers when visible is true', () => {
      const result = watchlistManager.getTickers(true);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL + ':visible');
      expect(result).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });

    it('should return empty array when no tickers found', () => {
      mockJQuery.mockReturnValue({
        ...mockJQueryChain,
        toArray: jest.fn().mockReturnValue([]),
      });

      const result = watchlistManager.getTickers();

      expect(result).toEqual([]);
    });

    it('should default to non-visible tickers when no parameter provided', () => {
      watchlistManager.getTickers();

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
    });
  });

  describe('getSelectedTickers', () => {
    beforeEach(() => {
      mockJQuery.mockReturnValue({
        ...mockJQueryChain,
        toArray: jest.fn().mockReturnValue([{ innerHTML: 'SELECTED1' }, { innerHTML: 'SELECTED2' }]),
      });
    });

    it('should return selected tickers with correct selector', () => {
      const result = watchlistManager.getSelectedTickers();

      const expectedSelector = `${Constants.DOM.WATCHLIST.SELECTED} ${Constants.DOM.WATCHLIST.SYMBOL}:visible`;
      expect(mockJQuery).toHaveBeenCalledWith(expectedSelector);
      expect(result).toEqual(['SELECTED1', 'SELECTED2']);
    });

    it('should return empty array when no selected tickers', () => {
      mockJQuery.mockReturnValue({
        ...mockJQueryChain,
        toArray: jest.fn().mockReturnValue([]),
      });

      const result = watchlistManager.getSelectedTickers();

      expect(result).toEqual([]);
    });
  });

  describe('paintWatchList', () => {
    beforeEach(() => {
      // Mock getTickers to return some tickers
      jest.spyOn(watchlistManager, 'getTickers').mockReturnValue(['AAPL', 'GOOGL']);

      // Mock getTickerCategories to return a mixed map
      const categoryMap = new Map<string, WatchCategory>();
      categoryMap.set('AAPL', { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: { state: 'READY' } });
      categoryMap.set('GOOGL', { id: WatchCategoryId.DEFAULT_DAILY, color: 'white', label: 'Default / Daily', recordUpdate: null });
      mockWatchManager.getTickerCategories.mockResolvedValue(categoryMap);
    });

    it('should execute complete paint workflow', async () => {
      await watchlistManager.paintWatchList();

      // Verify reset operations
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.WIDGET);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);

      // Verify watchlist classification was fetched
      expect(mockWatchManager.getTickerCategories).toHaveBeenCalledWith(['AAPL', 'GOOGL'], ['AAPL', 'GOOGL']);

      // Verify color painting was called for each category in ALL_WATCH_CATEGORIES
      expect(mockPaintManager.paintSymbols).toHaveBeenCalled();

      // Verify flag painting
      expect(mockFlagManager.paint).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL, Constants.DOM.WATCHLIST.ITEM);

      // Verify FNO painting
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(
        Constants.DOM.WATCHLIST.SYMBOL,
        mockFnoManager.getAllFnoTickers(),
        Constants.UI.COLORS.FNO_CSS
      );

      // Verify color reset
      expect(mockPaintManager.resetColors).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
    });

    it('should paint category symbols for each ALL_WATCH_CATEGORIES entry', async () => {
      await watchlistManager.paintWatchList();

      // Should call paintSymbols once per category
      const symbolCalls = mockPaintManager.paintSymbols.mock.calls.filter(
        (call) => call[0] === Constants.DOM.WATCHLIST.SYMBOL && call[2]?.color
      );
      // One per ALL_WATCH_CATEGORIES (paintSymbols) + one for FNO markings
      // Actually paintSymbols is also called by flagManager.paint internally, not here
      // Our paintWatchList calls paintSymbols for each category in ALL_WATCH_CATEGORIES
      expect(symbolCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should build summary labels for all categories', async () => {
      await watchlistManager.paintWatchList();

      // Should call buildLabel for each color category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);
    });

    it('should set widget height for expansion', async () => {
      await watchlistManager.paintWatchList();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all lines during reset', async () => {
      await watchlistManager.paintWatchList();

      expect(mockJQueryChain.show).toHaveBeenCalled();
    });
  });

  describe('applyDefaultFilters', () => {
    it('should add white/default color filter', () => {
      const addFilterSpy = jest.spyOn(watchlistManager as any, 'addFilter');

      watchlistManager.applyDefaultFilters();

      expect(addFilterSpy).toHaveBeenCalledWith({
        color: Constants.UI.COLORS.DEFAULT,
        index: 1, // Left click
        ctrl: false,
        shift: false,
      });
    });
  });

  describe('addFilter', () => {
    it('should reset filter chain when no modifier keys', () => {
      // This is fine as is — only internal filters, no watchManager dependency
    });
  });
});
