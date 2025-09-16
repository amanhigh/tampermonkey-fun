import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { IFlagRepo } from '../../src/repo/flag';
import { IPaintManager } from '../../src/manager/paint';
import { CategoryLists } from '../../src/models/category';
import { Constants } from '../../src/models/constant';

describe('FlagManager', () => {
  let flagManager: IFlagManager;
  let mockFlagRepo: jest.Mocked<IFlagRepo>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let getListSpy: jest.SpyInstance;
  let toggleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a real CategoryLists instance
    const mockMap = new Map<number, Set<string>>();
    const mockCategoryLists = new CategoryLists(mockMap);

    // Create spies
    getListSpy = jest.spyOn(mockCategoryLists, 'getList');
    toggleSpy = jest.spyOn(mockCategoryLists, 'toggle');

    // Mock FlagRepo
    mockFlagRepo = {
      getFlagCategoryLists: jest.fn().mockReturnValue(mockCategoryLists),
      getCount: jest.fn(),
      getAllItems: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      info: jest.fn(),
      getCategoryLists: jest.fn(),
    } as jest.Mocked<IFlagRepo>;

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as jest.Mocked<IPaintManager>;

    flagManager = new FlagManager(mockFlagRepo, mockPaintManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(flagManager).toBeDefined();
      expect(flagManager).toBeInstanceOf(FlagManager);
    });
  });

  describe('getCategory', () => {
    it('should return category set when category exists', () => {
      const categoryIndex = 0;
      const expectedSet = new Set(['RELIANCE', 'TCS']);

      getListSpy.mockReturnValue(expectedSet);

      const result = flagManager.getCategory(categoryIndex);

      expect(result).toBe(expectedSet);
      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalled();
      expect(getListSpy).toHaveBeenCalledWith(categoryIndex);
    });

    it('should throw error when category list not found', () => {
      const categoryIndex = 999;

      getListSpy.mockReturnValue(undefined);

      expect(() => flagManager.getCategory(categoryIndex)).toThrow(
        `Category list for index ${categoryIndex} not found`
      );

      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalled();
      expect(getListSpy).toHaveBeenCalledWith(categoryIndex);
    });

    it('should handle empty category set', () => {
      const categoryIndex = 1;
      const emptySet = new Set<string>();

      getListSpy.mockReturnValue(emptySet);

      const result = flagManager.getCategory(categoryIndex);

      expect(result).toBe(emptySet);
      expect(result.size).toBe(0);
    });
  });

  describe('recordCategory', () => {
    it('should record tickers in specified category', () => {
      const categoryIndex = 2;
      const tvTickers = ['NSE:HDFC', 'NSE:ICICI', 'NSE:SBI'];

      flagManager.recordCategory(categoryIndex, tvTickers);

      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalled();
      expect(toggleSpy).toHaveBeenCalledTimes(3);
      expect(toggleSpy).toHaveBeenCalledWith(categoryIndex, 'NSE:HDFC');
      expect(toggleSpy).toHaveBeenCalledWith(categoryIndex, 'NSE:ICICI');
      expect(toggleSpy).toHaveBeenCalledWith(categoryIndex, 'NSE:SBI');
    });

    it('should handle empty tickers array', () => {
      const categoryIndex = 1;
      const tvTickers: string[] = [];

      flagManager.recordCategory(categoryIndex, tvTickers);

      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalled();
      expect(toggleSpy).not.toHaveBeenCalled();
    });

    it('should handle single ticker', () => {
      const categoryIndex = 0;
      const tvTickers = ['NSE:NIFTY'];

      flagManager.recordCategory(categoryIndex, tvTickers);

      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalled();
      expect(toggleSpy).toHaveBeenCalledTimes(1);
      expect(toggleSpy).toHaveBeenCalledWith(categoryIndex, 'NSE:NIFTY');
    });
  });

  describe('paint', () => {
    beforeEach(() => {
      // Mock getCategory to return different sets for each index
      jest.spyOn(flagManager, 'getCategory').mockImplementation((index: number) => {
        switch (index) {
          case 0:
            return new Set(['RELIANCE', 'TCS']);
          case 1:
            return new Set(['HDFC', 'ICICI']);
          case 2:
            return new Set(['NIFTY']);
          default:
            return new Set();
        }
      });
    });

    it('should paint flags for all categories with correct colors', () => {
      const selector = '.symbol';
      const itemSelector = '.item';

      flagManager.paint(selector, itemSelector);

      const colorList = Constants.UI.COLORS.LIST;

      // Verify paint calls for each category
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);

      // Verify specific calls
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        selector,
        new Set(['RELIANCE', 'TCS']),
        colorList[0],
        itemSelector
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        selector,
        new Set(['HDFC', 'ICICI']),
        colorList[1],
        itemSelector
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        selector,
        new Set(['NIFTY']),
        colorList[2],
        itemSelector
      );
    });

    it('should handle empty categories during paint', () => {
      const selector = '.symbol';
      const itemSelector = '.item';

      // Mock all categories as empty
      jest.spyOn(flagManager, 'getCategory').mockReturnValue(new Set());

      flagManager.paint(selector, itemSelector);

      const colorList = Constants.UI.COLORS.LIST;

      // Should still call paint for each color/category
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);

      // Each call should be with empty set
      for (let i = 0; i < colorList.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(selector, new Set(), colorList[i], itemSelector);
      }
    });

    it('should use correct color list from constants', () => {
      const selector = '.test';
      const itemSelector = '.test-item';

      flagManager.paint(selector, itemSelector);

      const expectedColorList = Constants.UI.COLORS.LIST;

      // Verify colors are used in correct order
      for (let i = 0; i < expectedColorList.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenNthCalledWith(
          i + 1,
          selector,
          expect.any(Set),
          expectedColorList[i],
          itemSelector
        );
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow of recording and painting', () => {
      const categoryIndex = 1;
      const tvTickers = ['NSE:WIPRO', 'NSE:INFY'];
      const selector = '.symbol';
      const itemSelector = '.item';

      // Setup category list mock
      const categorySet = new Set(tvTickers);
      getListSpy.mockReturnValue(categorySet);

      // Record tickers
      flagManager.recordCategory(categoryIndex, tvTickers);

      // Paint flags
      flagManager.paint(selector, itemSelector);

      // Verify recording happened
      expect(toggleSpy).toHaveBeenCalledTimes(2);
      tvTickers.forEach((ticker) => {
        expect(toggleSpy).toHaveBeenCalledWith(categoryIndex, ticker);
      });

      // Verify painting happened for all categories
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(Constants.UI.COLORS.LIST.length);
    });

    it('should handle multiple category operations', () => {
      const category1 = 0;
      const category2 = 2;
      const tickers1 = ['NSE:RELIANCE'];
      const tickers2 = ['NSE:TCS', 'NSE:WIPRO'];

      // Record in multiple categories
      flagManager.recordCategory(category1, tickers1);
      flagManager.recordCategory(category2, tickers2);

      // Verify both recording operations
      expect(mockFlagRepo.getFlagCategoryLists).toHaveBeenCalledTimes(2);
      expect(toggleSpy).toHaveBeenCalledTimes(3);

      expect(toggleSpy).toHaveBeenCalledWith(category1, tickers1[0]);
      expect(toggleSpy).toHaveBeenCalledWith(category2, tickers2[0]);
      expect(toggleSpy).toHaveBeenCalledWith(category2, tickers2[1]);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', () => {
      const error = new Error('Repository error');
      mockFlagRepo.getFlagCategoryLists.mockImplementation(() => {
        throw error;
      });

      expect(() => flagManager.getCategory(0)).toThrow('Repository error');
    });

    it('should handle paint manager errors gracefully', () => {
      const error = new Error('Paint error');
      mockPaintManager.paintFlags.mockImplementation(() => {
        throw error;
      });

      // Mock successful getCategory
      jest.spyOn(flagManager, 'getCategory').mockReturnValue(new Set(['TEST']));

      expect(() => flagManager.paint('.test', '.item')).toThrow('Paint error');
    });

    it('should handle null/undefined tickers in recordCategory', () => {
      const categoryIndex = 0;

      // Test with array containing undefined values - should filter them out
      const tickersWithUndefined = ['NSE:VALID', undefined as any, 'NSE:ANOTHER'];

      expect(() => flagManager.recordCategory(categoryIndex, tickersWithUndefined)).not.toThrow();

      // Should attempt to toggle all provided values (even undefined ones)
      expect(toggleSpy).toHaveBeenCalledTimes(3);
    });
  });
});
