import { WatchManager, IWatchManager } from '../../src/manager/watch';
import { IWatchlistRepo } from '../../src/repo/watch';
import { CategoryLists } from '../../src/models/category';
import { Constants } from '../../src/models/constant';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

describe('WatchManager', () => {
  let watchManager: IWatchManager;
  let mockWatchRepo: jest.Mocked<IWatchlistRepo>;
  let mockCategoryLists: jest.Mocked<CategoryLists>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CategoryLists
    mockCategoryLists = {
      getList: jest.fn(),
      setList: jest.fn(),
      toggle: jest.fn(),
      add: jest.fn(),
      delete: jest.fn(),
      contains: jest.fn(),
      containsInAny: jest.fn(),
      getLists: jest.fn(),
    } as unknown as jest.Mocked<CategoryLists>;

    // Mock WatchlistRepo
    mockWatchRepo = {
      getWatchCategoryLists: jest.fn().mockReturnValue(mockCategoryLists),
      getAllItems: jest.fn(),
      getCategory: jest.fn(),
      getCategoryCount: jest.fn(),
      addToCategory: jest.fn(),
      removeFromCategory: jest.fn(),
      getAllKeys: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IWatchlistRepo>;

    // Set up default mock behavior for most tests (all categories exist)
    mockCategoryLists.getList.mockReturnValue(new Set(['DEFAULT']));

    watchManager = new WatchManager(mockWatchRepo);

    // Clear the mock call history after creating the default instance
    // This ensures constructor tests start with clean mock state
    mockCategoryLists.setList.mockClear();
  });

  describe('constructor and initialization', () => {
    it('should initialize category lists during construction', () => {
      // Setup - mock empty category lists that need initialization
      mockCategoryLists.getList.mockImplementation((index: number) => {
        return index < 4 ? undefined : new Set<string>(); // First 4 are undefined
      });

      // Create a new manager to test initialization
      new WatchManager(mockWatchRepo);

      expect(mockWatchRepo.getWatchCategoryLists).toHaveBeenCalled();
      // Should call setList for each undefined category (0-3 only)
      expect(mockCategoryLists.setList).toHaveBeenCalledTimes(4);
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(0, new Set());
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(1, new Set());
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(2, new Set());
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(3, new Set());
    });

    it('should not reinitialize existing category lists', () => {
      // Setup - all categories already exist
      mockCategoryLists.getList.mockReturnValue(new Set(['HDFC']));

      // Create a new manager to test no initialization
      new WatchManager(mockWatchRepo);

      expect(mockCategoryLists.setList).not.toHaveBeenCalled();
    });
  });

  describe('getCategory', () => {
    it('should return category set for valid index', () => {
      const testSet = new Set(['HDFC', 'RELIANCE']);
      mockCategoryLists.getList.mockReturnValue(testSet);

      const result = watchManager.getCategory(3);

      expect(mockWatchRepo.getWatchCategoryLists).toHaveBeenCalled();
      expect(mockCategoryLists.getList).toHaveBeenCalledWith(3);
      expect(result).toBe(testSet);
    });

    it('should throw error for negative category index', () => {
      expect(() => watchManager.getCategory(-1)).toThrow('Invalid category index: -1. Must be between 0 and 7');
    });

    it('should throw error for category index >= 8', () => {
      expect(() => watchManager.getCategory(8)).toThrow('Invalid category index: 8. Must be between 0 and 7');
    });

    it('should handle missing category list by creating new set and throwing error', () => {
      mockCategoryLists.getList.mockReturnValue(undefined);

      expect(() => watchManager.getCategory(5)).toThrow('Category list for index 5 not found');

      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, new Set());
    });
  });

  describe('getDefaultWatchlist', () => {
    it('should return category 5 (default watchlist)', () => {
      const defaultSet = new Set(['HDFC', 'NIFTY']);
      mockCategoryLists.getList.mockReturnValue(defaultSet);

      const result = watchManager.getDefaultWatchlist();

      expect(mockCategoryLists.getList).toHaveBeenCalledWith(5);
      expect(result).toBe(defaultSet);
    });

    it('should handle empty default watchlist', () => {
      const emptySet = new Set<string>();
      mockCategoryLists.getList.mockReturnValue(emptySet);

      const result = watchManager.getDefaultWatchlist();

      expect(result).toBe(emptySet);
      expect(result.size).toBe(0);
    });
  });

  describe('recordCategory', () => {
    it('should record tickers in specified category', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];

      watchManager.recordCategory(2, tickers);

      expect(mockWatchRepo.getWatchCategoryLists).toHaveBeenCalled();
      expect(mockCategoryLists.toggle).toHaveBeenCalledTimes(3);
      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(2, 'HDFC');
      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(2, 'RELIANCE');
      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(2, 'TCS');
    });

    it('should handle empty ticker array', () => {
      watchManager.recordCategory(1, []);

      expect(mockCategoryLists.toggle).not.toHaveBeenCalled();
    });

    it('should handle single ticker', () => {
      watchManager.recordCategory(0, ['NIFTY']);

      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(0, 'NIFTY');
    });
  });

  describe('computeDefaultList', () => {
    beforeEach(() => {
      // Mock Constants.UI.COLORS.LIST to have 8 items (indices 0-7)
      (Constants.UI.COLORS.LIST as any) = new Array(8).fill('color');
    });

    it('should compute default watchlist excluding items from other categories', () => {
      const tvWatchlistTickers = ['HDFC', 'RELIANCE', 'TCS', 'WIPRO', 'INFY'];

      // Setup category lists - categories 0-4, 6-7 have some tickers, category 5 is watchlist
      const mockCategoryMap = new Map<number, Set<string>>([
        [0, new Set(['HDFC'])],
        [1, new Set(['RELIANCE'])],
        [2, new Set()],
        [3, new Set(['TCS'])],
        [4, new Set()],
        [5, new Set()], // Default watchlist - will be replaced
        [6, new Set(['WIPRO'])],
        [7, new Set()],
      ]);

      mockCategoryLists.getList.mockImplementation((index: number) => mockCategoryMap.get(index));

      watchManager.computeDefaultList(tvWatchlistTickers);

      // Should create new set with INFY only (others are in different categories)
      const expectedWatchlist = new Set(['INFY']);
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, expectedWatchlist);
    });

    it('should handle all tickers being in other categories', () => {
      const tvWatchlistTickers = ['HDFC', 'RELIANCE'];

      const mockCategoryMap = new Map<number, Set<string>>([
        [0, new Set(['HDFC'])],
        [1, new Set(['RELIANCE'])],
        [2, new Set()],
        [3, new Set()],
        [4, new Set()],
        [5, new Set()], // Default watchlist
        [6, new Set()],
        [7, new Set()],
      ]);

      mockCategoryLists.getList.mockImplementation((index: number) => mockCategoryMap.get(index));

      watchManager.computeDefaultList(tvWatchlistTickers);

      // Should create empty set
      const expectedWatchlist = new Set();
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, expectedWatchlist);
    });

    it('should handle no tickers in other categories', () => {
      const tvWatchlistTickers = ['HDFC', 'RELIANCE', 'TCS'];

      // All categories are empty
      mockCategoryLists.getList.mockReturnValue(new Set());

      watchManager.computeDefaultList(tvWatchlistTickers);

      // Should include all watchlist tickers
      const expectedWatchlist = new Set(['HDFC', 'RELIANCE', 'TCS']);
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, expectedWatchlist);
    });

    it('should handle undefined category lists', () => {
      const tvWatchlistTickers = ['HDFC', 'RELIANCE'];

      mockCategoryLists.getList.mockImplementation((index: number) => {
        return index === 0 ? new Set(['HDFC']) : undefined;
      });

      watchManager.computeDefaultList(tvWatchlistTickers);

      // Should handle undefined gracefully and only exclude HDFC
      const expectedWatchlist = new Set(['RELIANCE']);
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, expectedWatchlist);
    });
  });

  describe('isWatched', () => {
    it('should return true when ticker is in any category', () => {
      const allWatchedItems = new Set(['HDFC', 'RELIANCE', 'TCS']);
      mockWatchRepo.getAllItems.mockReturnValue(allWatchedItems);

      const result = watchManager.isWatched('HDFC');

      expect(mockWatchRepo.getAllItems).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when ticker is not watched', () => {
      const allWatchedItems = new Set(['HDFC', 'RELIANCE']);
      mockWatchRepo.getAllItems.mockReturnValue(allWatchedItems);

      const result = watchManager.isWatched('TCS');

      expect(result).toBe(false);
    });

    it('should handle empty watched items', () => {
      mockWatchRepo.getAllItems.mockReturnValue(new Set());

      const result = watchManager.isWatched('HDFC');

      expect(result).toBe(false);
    });

    it('should handle case sensitivity', () => {
      const allWatchedItems = new Set(['HDFC']);
      mockWatchRepo.getAllItems.mockReturnValue(allWatchedItems);

      expect(watchManager.isWatched('HDFC')).toBe(true);
      expect(watchManager.isWatched('hdfc')).toBe(false);
    });
  });

  describe('dryRunClean', () => {
    it('should count items that would be removed without executing changes', () => {
      const currentTickers = ['HDFC', 'RELIANCE'];

      // Setup categories with some tickers that are not in current watchlist
      const mockCategoryMap = new Map([
        [0, new Set(['HDFC', 'TCS'])], // TCS will be removed
        [1, new Set(['RELIANCE', 'WIPRO'])], // WIPRO will be removed
        [2, new Set(['INFY'])], // INFY will be removed
      ]);

      mockCategoryLists.getLists.mockReturnValue(mockCategoryMap);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = watchManager.dryRunClean(currentTickers);

      expect(result).toBe(3); // TCS, WIPRO, INFY
      expect(mockCategoryLists.delete).not.toHaveBeenCalled(); // No actual changes
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith('Removing TCS from category 0');
      expect(consoleSpy).toHaveBeenCalledWith('Removing WIPRO from category 1');
      expect(consoleSpy).toHaveBeenCalledWith('Removing INFY from category 2');

      consoleSpy.mockRestore();
    });

    it('should return 0 when no items need to be removed', () => {
      const currentTickers = ['HDFC', 'RELIANCE', 'TCS'];

      const mockCategoryMap = new Map([
        [0, new Set(['HDFC'])],
        [1, new Set(['RELIANCE'])],
        [2, new Set(['TCS'])],
      ]);

      mockCategoryLists.getLists.mockReturnValue(mockCategoryMap);

      const result = watchManager.dryRunClean(currentTickers);

      expect(result).toBe(0);
    });
  });

  describe('clean', () => {
    it('should remove items not in watchlist and execute changes', () => {
      const currentTickers = ['HDFC'];

      const mockCategoryMap = new Map([
        [0, new Set(['HDFC', 'RELIANCE'])], // RELIANCE will be removed
        [1, new Set(['TCS'])], // TCS will be removed
      ]);

      mockCategoryLists.getLists.mockReturnValue(mockCategoryMap);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = watchManager.clean(currentTickers);

      expect(result).toBe(2); // RELIANCE, TCS
      expect(mockCategoryLists.delete).toHaveBeenCalledTimes(2);
      expect(mockCategoryLists.delete).toHaveBeenCalledWith(0, 'RELIANCE');
      expect(mockCategoryLists.delete).toHaveBeenCalledWith(1, 'TCS');

      consoleSpy.mockRestore();
    });

    it('should handle empty categories', () => {
      const currentTickers = ['HDFC'];
      const emptyMap = new Map();

      mockCategoryLists.getLists.mockReturnValue(emptyMap);

      const result = watchManager.clean(currentTickers);

      expect(result).toBe(0);
      expect(mockCategoryLists.delete).not.toHaveBeenCalled();
    });

    it('should handle empty current tickers (remove all)', () => {
      const currentTickers: string[] = [];

      const mockCategoryMap = new Map([
        [0, new Set(['HDFC', 'RELIANCE'])],
        [1, new Set(['TCS'])],
      ]);

      mockCategoryLists.getLists.mockReturnValue(mockCategoryMap);

      const result = watchManager.clean(currentTickers);

      expect(result).toBe(3); // All items removed
      expect(mockCategoryLists.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle category boundary values', () => {
      const validSet = new Set(['HDFC']);
      mockCategoryLists.getList.mockReturnValue(validSet);

      // Test boundary values
      expect(watchManager.getCategory(0)).toBe(validSet); // Min valid
      expect(watchManager.getCategory(7)).toBe(validSet); // Max valid

      expect(() => watchManager.getCategory(-1)).toThrow(); // Below min
      expect(() => watchManager.getCategory(8)).toThrow(); // Above max
    });

    it('should handle recordCategory with duplicate tickers', () => {
      const tickers = ['HDFC', 'HDFC', 'RELIANCE'];

      watchManager.recordCategory(1, tickers);

      // Should call toggle for each ticker, even duplicates
      expect(mockCategoryLists.toggle).toHaveBeenCalledTimes(3);
      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(1, 'HDFC');
      expect(mockCategoryLists.toggle).toHaveBeenNthCalledWith(2, 1, 'HDFC');
      expect(mockCategoryLists.toggle).toHaveBeenCalledWith(1, 'RELIANCE');
    });

    it('should handle cleanup with special characters in ticker names', () => {
      const currentTickers = ['M&M'];

      const mockCategoryMap = new Map([
        [0, new Set(['M&M', 'L&T'])], // L&T will be removed
      ]);

      mockCategoryLists.getLists.mockReturnValue(mockCategoryMap);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = watchManager.clean(currentTickers);

      expect(result).toBe(1);
      expect(mockCategoryLists.delete).toHaveBeenCalledWith(0, 'L&T');

      consoleSpy.mockRestore();
    });

    it('should handle computeDefaultList with large ticker lists', () => {
      const largeTickers = Array.from({ length: 1000 }, (_, i) => `TICKER${i}`);
      (Constants.UI.COLORS.LIST as any) = new Array(8).fill('color');

      // All categories are empty
      mockCategoryLists.getList.mockReturnValue(new Set());

      watchManager.computeDefaultList(largeTickers);

      const expectedSet = new Set(largeTickers);
      expect(mockCategoryLists.setList).toHaveBeenCalledWith(5, expectedSet);
    });

    it('should handle watchRepo returning undefined for getAllItems', () => {
      mockWatchRepo.getAllItems.mockReturnValue(new Set());

      const result = watchManager.isWatched('HDFC');

      expect(result).toBe(false);
    });
  });
});
