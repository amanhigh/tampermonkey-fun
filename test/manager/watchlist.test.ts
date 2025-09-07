import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { IUIUtil } from '../../src/util/ui';
import { IFnoRepo } from '../../src/repo/fno';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { Constants } from '../../src/models/constant';

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
  let mockFnoRepo: jest.Mocked<IFnoRepo>;
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

    mockFnoRepo = {
      getAll: jest.fn().mockReturnValue(new Set(['FNO1', 'FNO2'])),
    } as unknown as jest.Mocked<IFnoRepo>;

    mockWatchManager = {
      computeDefaultList: jest.fn(),
      getCategory: jest.fn().mockReturnValue(new Set(['STOCK1', 'STOCK2'])),
    } as unknown as jest.Mocked<IWatchManager>;

    mockFlagManager = {
      paint: jest.fn(),
    } as unknown as jest.Mocked<IFlagManager>;

    // Reset jQuery mock
    mockJQuery.mockReturnValue(mockJQueryChain);

    watchlistManager = new TradingViewWatchlistManager(
      mockPaintManager,
      mockUIUtil,
      mockFnoRepo,
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

      // Mock category sizes for summary
      mockWatchManager.getCategory
        .mockReturnValueOnce(new Set(['AAPL'])) // Category 0
        .mockReturnValueOnce(new Set(['GOOGL', 'MSFT'])) // Category 1
        .mockReturnValueOnce(new Set()) // Category 2
        .mockReturnValueOnce(new Set(['TSLA'])); // Category 3
    });

    it('should execute complete paint workflow', () => {
      watchlistManager.paintWatchList();

      // Verify reset operations
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.WIDGET);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);

      // Verify watchlist computation
      expect(mockWatchManager.computeDefaultList).toHaveBeenCalledWith(['AAPL', 'GOOGL']);

      // Verify color painting
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL, expect.any(Set), {
        color: expect.any(String),
      });

      // Verify flag painting
      expect(mockFlagManager.paint).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL, Constants.DOM.WATCHLIST.ITEM);

      // Verify FNO painting
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(
        Constants.DOM.WATCHLIST.SYMBOL,
        mockFnoRepo.getAll(),
        Constants.UI.COLORS.FNO_CSS
      );

      // Verify color reset
      expect(mockPaintManager.resetColors).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
    });

    it('should paint all color categories', () => {
      watchlistManager.paintWatchList();

      // Should call paintSymbols for each color in the list
      const colorCallCount = mockPaintManager.paintSymbols.mock.calls.filter(
        (call) => call[0] === Constants.DOM.WATCHLIST.SYMBOL && call[2].hasOwnProperty('color')
      ).length;

      expect(colorCallCount).toBe(Constants.UI.COLORS.LIST.length);
    });

    it('should build summary labels for all categories', () => {
      watchlistManager.paintWatchList();

      // Should call buildLabel for each color category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);
    });

    it('should set widget height for expansion', () => {
      watchlistManager.paintWatchList();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all lines during reset', () => {
      watchlistManager.paintWatchList();

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
    let applyFiltersSpy: jest.SpyInstance;

    beforeEach(() => {
      applyFiltersSpy = jest.spyOn(watchlistManager as any, 'applyFilters');
    });

    it('should reset filter chain when no modifier keys', () => {
      const filter1 = { color: 'red', index: 1, ctrl: false, shift: false };
      const filter2 = { color: 'blue', index: 1, ctrl: false, shift: false };

      (watchlistManager as any).addFilter(filter1);
      (watchlistManager as any).addFilter(filter2);

      expect((watchlistManager as any).filterChain).toEqual([filter2]);
      expect(applyFiltersSpy).toHaveBeenCalledTimes(2);
    });

    it('should add to filter chain when ctrl key is pressed', () => {
      const filter1 = { color: 'red', index: 1, ctrl: false, shift: false };
      const filter2 = { color: 'blue', index: 1, ctrl: true, shift: false };

      (watchlistManager as any).addFilter(filter1);
      (watchlistManager as any).addFilter(filter2);

      expect((watchlistManager as any).filterChain).toEqual([filter1, filter2]);
      expect(applyFiltersSpy).toHaveBeenCalledTimes(2);
    });

    it('should add to filter chain when shift key is pressed', () => {
      const filter1 = { color: 'red', index: 1, ctrl: false, shift: false };
      const filter2 = { color: 'blue', index: 1, ctrl: false, shift: true };

      (watchlistManager as any).addFilter(filter1);
      (watchlistManager as any).addFilter(filter2);

      expect((watchlistManager as any).filterChain).toEqual([filter1, filter2]);
      expect(applyFiltersSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('applyFilters', () => {
    it('should apply all filters in chain', () => {
      const filterWatchListSpy = jest.spyOn(watchlistManager as any, 'filterWatchList');
      const filter1 = { color: 'red', index: 1, ctrl: false, shift: false };
      const filter2 = { color: 'blue', index: 1, ctrl: true, shift: false };

      (watchlistManager as any).filterChain = [filter1, filter2];
      (watchlistManager as any).applyFilters();

      expect(filterWatchListSpy).toHaveBeenCalledWith(filter1);
      expect(filterWatchListSpy).toHaveBeenCalledWith(filter2);
      expect(filterWatchListSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle empty filter chain', () => {
      const filterWatchListSpy = jest.spyOn(watchlistManager as any, 'filterWatchList');

      (watchlistManager as any).filterChain = [];
      (watchlistManager as any).applyFilters();

      expect(filterWatchListSpy).not.toHaveBeenCalled();
    });
  });

  describe('filterWatchList', () => {
    let hideAllItemsSpy: jest.SpyInstance;
    let handleSymbolFilterSpy: jest.SpyInstance;
    let handleResetFilterSpy: jest.SpyInstance;
    let handleFlagFilterSpy: jest.SpyInstance;

    beforeEach(() => {
      hideAllItemsSpy = jest.spyOn(watchlistManager as any, 'hideAllItems');
      handleSymbolFilterSpy = jest.spyOn(watchlistManager as any, 'handleSymbolFilter');
      handleResetFilterSpy = jest.spyOn(watchlistManager as any, 'handleResetFilter');
      handleFlagFilterSpy = jest.spyOn(watchlistManager as any, 'handleFlagFilter');
    });

    it('should handle left click (symbol filter)', () => {
      const filter = { color: 'red', index: 1, ctrl: false, shift: false };

      (watchlistManager as any).filterWatchList(filter);

      expect(hideAllItemsSpy).toHaveBeenCalled();
      expect(handleSymbolFilterSpy).toHaveBeenCalledWith(filter);
      expect(handleResetFilterSpy).not.toHaveBeenCalled();
      expect(handleFlagFilterSpy).not.toHaveBeenCalled();
    });

    it('should handle middle click (reset filter)', () => {
      const filter = { color: 'red', index: 2, ctrl: false, shift: false };

      (watchlistManager as any).filterWatchList(filter);

      expect(hideAllItemsSpy).toHaveBeenCalled();
      expect(handleResetFilterSpy).toHaveBeenCalled();
      expect(handleSymbolFilterSpy).not.toHaveBeenCalled();
      expect(handleFlagFilterSpy).not.toHaveBeenCalled();
    });

    it('should handle right click (flag filter)', () => {
      const filter = { color: 'red', index: 3, ctrl: false, shift: false };

      (watchlistManager as any).filterWatchList(filter);

      expect(hideAllItemsSpy).toHaveBeenCalled();
      expect(handleFlagFilterSpy).toHaveBeenCalledWith(filter);
      expect(handleSymbolFilterSpy).not.toHaveBeenCalled();
      expect(handleResetFilterSpy).not.toHaveBeenCalled();
    });

    it('should not hide all items when modifier keys are pressed', () => {
      const filter = { color: 'red', index: 1, ctrl: true, shift: false };

      (watchlistManager as any).filterWatchList(filter);

      expect(hideAllItemsSpy).not.toHaveBeenCalled();
      expect(handleSymbolFilterSpy).toHaveBeenCalledWith(filter);
    });

    it('should throw error for invalid mouse button index', () => {
      const filter = { color: 'red', index: 4, ctrl: false, shift: false };

      expect(() => {
        (watchlistManager as any).filterWatchList(filter);
      }).toThrow('You have a strange Mouse!');
    });
  });

  describe('hideAllItems', () => {
    it('should hide watchlist and screener lines', () => {
      (watchlistManager as any).hideAllItems();

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);
      expect(mockJQueryChain.hide).toHaveBeenCalledTimes(2);
    });
  });

  describe('filterByColor', () => {
    it('should show elements with matching color when shift is false', () => {
      const color = 'red';

      (watchlistManager as any).filterByColor(color, false);

      const expectedWatchlistSelector = `${Constants.DOM.WATCHLIST.SYMBOL}[style*='color: ${color}']`;
      const expectedScreenerSelector = `${Constants.DOM.SCREENER.SYMBOL}[style*='color: ${color}']`;

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE + ':hidden');
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE + ':hidden');
      expect(mockJQueryChain.has).toHaveBeenCalledWith(expectedWatchlistSelector);
      expect(mockJQueryChain.has).toHaveBeenCalledWith(expectedScreenerSelector);
      expect(mockJQueryChain.show).toHaveBeenCalled();
    });

    it('should hide elements without matching color when shift is true', () => {
      const color = 'blue';

      (watchlistManager as any).filterByColor(color, true);

      const expectedWatchlistSelector = `${Constants.DOM.WATCHLIST.SYMBOL}[style*='color: ${color}']`;
      const expectedScreenerSelector = `${Constants.DOM.SCREENER.SYMBOL}[style*='color: ${color}']`;

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);
      expect(mockJQueryChain.not).toHaveBeenCalledWith(`:has(${expectedWatchlistSelector})`);
      expect(mockJQueryChain.not).toHaveBeenCalledWith(`:has(${expectedScreenerSelector})`);
      expect(mockJQueryChain.hide).toHaveBeenCalled();
    });
  });

  describe('filterByFlag', () => {
    it('should show elements with matching flag color when shift is false', () => {
      const color = 'green';

      (watchlistManager as any).filterByFlag(color, false);

      const expectedFlagSelector = `${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${color}']`;

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE + ':hidden');
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE + ':hidden');
      expect(mockJQueryChain.has).toHaveBeenCalledWith(expectedFlagSelector);
      expect(mockJQueryChain.show).toHaveBeenCalled();
    });

    it('should hide elements with matching flag color when shift is true', () => {
      const color = 'yellow';

      (watchlistManager as any).filterByFlag(color, true);

      const expectedFlagSelector = `${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${color}']`;

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);
      expect(mockJQueryChain.has).toHaveBeenCalledWith(expectedFlagSelector);
      expect(mockJQueryChain.hide).toHaveBeenCalled();
    });
  });

  describe('handleResetFilter', () => {
    it('should reset watchlist and clear filter chain', () => {
      const resetWatchListSpy = jest.spyOn(watchlistManager as any, 'resetWatchList');

      (watchlistManager as any).filterChain = [{ color: 'red', index: 1, ctrl: false, shift: false }];
      (watchlistManager as any).handleResetFilter();

      expect(resetWatchListSpy).toHaveBeenCalled();
      expect((watchlistManager as any).filterChain).toEqual([]);
    });
  });

  describe('displaySetSummary', () => {
    beforeEach(() => {
      // Mock category counts
      mockWatchManager.getCategory
        .mockReturnValueOnce(new Set(['AAPL'])) // Size 1
        .mockReturnValueOnce(new Set(['GOOGL', 'MSFT'])) // Size 2
        .mockReturnValueOnce(new Set()) // Size 0
        .mockReturnValueOnce(new Set(['TSLA'])); // Size 1
    });

    it('should create summary labels for all color categories', () => {
      (watchlistManager as any).displaySetSummary();

      expect(mockJQuery).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
      expect(mockJQueryChain.empty).toHaveBeenCalled();

      // Should build label for each color
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);

      // Check specific label calls
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('1|', Constants.UI.COLORS.LIST[0]);
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('2|', Constants.UI.COLORS.LIST[1]);
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('0|', Constants.UI.COLORS.LIST[2]);
    });

    it('should set up event handlers for summary labels', () => {
      (watchlistManager as any).displaySetSummary();

      // Should set up mousedown and contextmenu handlers
      expect(mockJQueryChain.mousedown).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);
      expect(mockJQueryChain.contextmenu).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);
    });

    it('should handle null category gracefully', () => {
      mockWatchManager.getCategory.mockReturnValue(new Set());

      (watchlistManager as any).displaySetSummary();

      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('0|', expect.any(String));
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete filter workflow', () => {
      // Setup initial state
      jest.spyOn(watchlistManager, 'getTickers').mockReturnValue(['AAPL', 'GOOGL']);

      // Paint watchlist
      watchlistManager.paintWatchList();

      // Apply default filters
      watchlistManager.applyDefaultFilters();

      // Verify painting was called
      expect(mockPaintManager.paintSymbols).toHaveBeenCalled();
      expect(mockFlagManager.paint).toHaveBeenCalled();

      // Verify default filter was applied
      expect((watchlistManager as any).filterChain).toHaveLength(1);
      expect((watchlistManager as any).filterChain[0]).toEqual({
        color: Constants.UI.COLORS.DEFAULT,
        index: 1,
        ctrl: false,
        shift: false,
      });
    });

    it('should handle multiple filter combinations', () => {
      const filter1 = { color: 'red', index: 1, ctrl: false, shift: false };
      const filter2 = { color: 'blue', index: 1, ctrl: true, shift: false };
      const filter3 = { color: 'green', index: 3, ctrl: true, shift: true };

      (watchlistManager as any).addFilter(filter1);
      (watchlistManager as any).addFilter(filter2);
      (watchlistManager as any).addFilter(filter3);

      expect((watchlistManager as any).filterChain).toEqual([filter1, filter2, filter3]);
    });
  });
});
