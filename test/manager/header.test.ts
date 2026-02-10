import { HeaderManager, IHeaderManager } from '../../src/manager/header';
import { IPaintManager } from '../../src/manager/paint';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { ITickerManager } from '../../src/manager/ticker';
import { IFnoRepo } from '../../src/repo/fno';
import { Constants } from '../../src/models/constant';

// Mock jQuery
const mockJQueryElement = {
  css: jest.fn().mockReturnThis(),
};
const mockJQuery = jest.fn(() => mockJQueryElement);
(global as any).$ = mockJQuery;

describe('HeaderManager', () => {
  let headerManager: IHeaderManager;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockFlagManager: jest.Mocked<IFlagManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockFnoRepo: jest.Mocked<IFnoRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as jest.Mocked<IPaintManager>;

    // Mock WatchManager
    mockWatchManager = {
      getCategory: jest.fn(),
      getDefaultWatchlist: jest.fn(),
      computeDefaultList: jest.fn(),
      recordCategory: jest.fn(),
      evictTicker: jest.fn(),
      dryRunClean: jest.fn(),
      clean: jest.fn(),
      isWatched: jest.fn(),
    } as jest.Mocked<IWatchManager>;

    // Mock FlagManager
    mockFlagManager = {
      getCategory: jest.fn(),
      recordCategory: jest.fn(),
      evictTicker: jest.fn(),
      paint: jest.fn(),
    } as jest.Mocked<IFlagManager>;

    // Mock TickerManager
    mockTickerManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      getSelectedTickers: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
      deleteTicker: jest.fn(),
    };

    // Mock FnoRepo
    mockFnoRepo = {
      has: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getAll: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      info: jest.fn(),
    } as jest.Mocked<IFnoRepo>;

    headerManager = new HeaderManager(
      mockPaintManager,
      mockWatchManager,
      mockFlagManager,
      mockTickerManager,
      mockFnoRepo
    );
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(headerManager).toBeDefined();
      expect(headerManager).toBeInstanceOf(HeaderManager);
    });
  });

  describe('paintHeader', () => {
    beforeEach(() => {
      mockTickerManager.getTicker.mockReturnValue('NSE:RELIANCE');
      mockJQuery.mockReturnValue(mockJQueryElement);
    });

    it('should paint header with all components', () => {
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // Verify ticker was retrieved
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Verify DOM elements were selected
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.NAME);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.FLAGS.MARKING);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);

      // Verify CSS was applied
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);

      // Verify paint manager was called for FNO marking
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, false);
    });

    it('should paint name element with category color when ticker is in watch category', () => {
      const ticker = 'NSE:RELIANCE';
      const categoryIndex = 2;
      const categorySet = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory
        .mockReturnValueOnce(new Set()) // category 0
        .mockReturnValueOnce(new Set()) // category 1
        .mockReturnValueOnce(categorySet); // category 2
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      expect(mockWatchManager.getCategory).toHaveBeenCalledTimes(3);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[categoryIndex]);
    });

    it('should use special color mapping for category 5', () => {
      const ticker = 'NSE:NIFTY';
      const categorySet = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      // Mock categories 0-4 as empty, category 5 with ticker
      mockWatchManager.getCategory
        .mockReturnValueOnce(new Set()) // 0
        .mockReturnValueOnce(new Set()) // 1
        .mockReturnValueOnce(new Set()) // 2
        .mockReturnValueOnce(new Set()) // 3
        .mockReturnValueOnce(new Set()) // 4
        .mockReturnValueOnce(categorySet); // 5
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // For category 5, should use color index 6
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[6]);
    });

    it('should paint flag and exchange elements with flag colors', () => {
      const ticker = 'NSE:TCS';
      const flagCategoryIndex = 1;
      const flagSet = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory
        .mockReturnValueOnce(new Set()) // category 0
        .mockReturnValueOnce(flagSet); // category 1
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      expect(mockFlagManager.getCategory).toHaveBeenCalledTimes(2);
      // Flag and exchange should be colored with flag category color
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[flagCategoryIndex]);
    });

    it('should paint FNO marking when ticker is in FNO repo', () => {
      const ticker = 'NSE:HDFC';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(true);

      headerManager.paintHeader();

      expect(mockFnoRepo.has).toHaveBeenCalledWith(ticker);
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });

    it('should reset colors to default before applying category colors', () => {
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // Should set default colors for all elements
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should stop at first matching watch category', () => {
      const ticker = 'NSE:WIPRO';
      const category1Set = new Set([ticker]);
      const category3Set = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory
        .mockReturnValueOnce(new Set()) // category 0
        .mockReturnValueOnce(category1Set) // category 1 - first match
        .mockReturnValueOnce(new Set()) // category 2
        .mockReturnValueOnce(category3Set); // category 3 - should not reach here
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // Should use color for category 1, not category 3
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[1]);
      // Should not check category 3 due to break
      expect(mockWatchManager.getCategory).toHaveBeenCalledTimes(2);
    });

    it('should stop at first matching flag category', () => {
      const ticker = 'NSE:INFY';
      const flag0Set = new Set([ticker]);
      const flag2Set = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory
        .mockReturnValueOnce(flag0Set) // category 0 - first match
        .mockReturnValueOnce(new Set()) // category 1
        .mockReturnValueOnce(flag2Set); // category 2 - should not reach here
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // Should use color for category 0, not category 2
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[0]);
      // Should not check category 2 due to break
      expect(mockFlagManager.getCategory).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle ticker in both watch and flag categories', () => {
      const ticker = 'NSE:BANKNIFTY';
      const watchSet = new Set([ticker]);
      const flagSet = new Set([ticker]);

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValueOnce(watchSet); // category 0
      mockFlagManager.getCategory.mockReturnValueOnce(flagSet); // category 0
      mockFnoRepo.has.mockReturnValue(true);

      headerManager.paintHeader();

      // Name should be colored with watch category color
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[0]);
      // Flag and exchange should be colored with flag category color (same in this case)
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[0]);
      // FNO marking should be painted
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });

    it('should handle ticker with no categories but in FNO', () => {
      const ticker = 'NSE:SBIN';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(true);

      headerManager.paintHeader();

      // Should use default colors for name, flag, and exchange
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
      // But should still paint FNO marking
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });

    it('should handle complete header painting workflow', () => {
      const ticker = 'NSE:ICICI';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(false);

      headerManager.paintHeader();

      // Verify all major operations were performed
      expect(mockTickerManager.getTicker).toHaveBeenCalled();
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.NAME);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.FLAGS.MARKING);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);
      expect(mockWatchManager.getCategory).toHaveBeenCalled();
      expect(mockFlagManager.getCategory).toHaveBeenCalled();
      expect(mockFnoRepo.has).toHaveBeenCalledWith(ticker);
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle ticker manager errors gracefully', () => {
      const error = new Error('Ticker retrieval failed');
      mockTickerManager.getTicker.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('Ticker retrieval failed');
    });

    it('should handle watch manager errors gracefully', () => {
      const error = new Error('Watch category failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockWatchManager.getCategory.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('Watch category failed');
    });

    it('should handle flag manager errors gracefully', () => {
      const error = new Error('Flag category failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('Flag category failed');
    });

    it('should handle FNO repository errors gracefully', () => {
      const error = new Error('FNO check failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('FNO check failed');
    });

    it('should handle paint manager errors gracefully', () => {
      const error = new Error('Paint FNO failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockWatchManager.getCategory.mockReturnValue(new Set());
      mockFlagManager.getCategory.mockReturnValue(new Set());
      mockFnoRepo.has.mockReturnValue(true);
      mockPaintManager.paintFNOMarking.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('Paint FNO failed');
    });

    it('should handle jQuery selector errors gracefully', () => {
      const error = new Error('jQuery selector failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockJQuery.mockImplementation(() => {
        throw error;
      });

      expect(() => headerManager.paintHeader()).toThrow('jQuery selector failed');
    });
  });
});
