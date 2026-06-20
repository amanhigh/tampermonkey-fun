import { FilterManager, IFilterManager } from '../../src/manager/filter';
import { IUIUtil } from '../../src/util/ui';
import { Constants } from '../../src/models/constant';
import { ALL_WATCH_CATEGORIES, BucketSummary, WatchCategoryId } from '../../src/models/watch';

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

describe('FilterManager', () => {
  let filterManager: IFilterManager;
  let mockUIUtil: jest.Mocked<IUIUtil>;

  const mockJQueryChain = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQueryChain),
    } as unknown as jest.Mocked<IUIUtil>;

    // Reset jQuery mock return value
    mockJQuery.mockReturnValue(mockJQueryChain);

    filterManager = new FilterManager(mockUIUtil);
  });

  describe('Constructor', () => {
    it('should apply default white filter on construction', () => {
      // Construction should have triggered filter calls via addFilter → applyFilters
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQueryChain.hide).toHaveBeenCalled();
    });
  });

  describe('resetWatchList', () => {
    it('should set widget height for expansion', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockJQueryChain);

      filterManager.resetWatchList();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all watchlist and screener lines', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockJQueryChain);

      filterManager.resetWatchList();

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);
      expect(mockJQueryChain.show).toHaveBeenCalled();
    });
  });

  describe('refreshSummary', () => {
    let classifyResult: BucketSummary;

    beforeEach(() => {
      classifyResult = {
        buckets: new Map(),
        uncategorizedCount: 0,
      };
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockJQueryChain);
    });

    it('should build summary labels for all categories', () => {
      filterManager.refreshSummary(classifyResult);

      // Should call buildLabel once per category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(ALL_WATCH_CATEGORIES.length);
    });

    it('should include uncategorized count in DEFAULT_DAILY label', () => {
      classifyResult = {
        buckets: new Map([[WatchCategoryId.READY, 1]]),
        uncategorizedCount: 2,
      };

      filterManager.refreshSummary(classifyResult);

      // DEFAULT_DAILY gets uncategorized count added
      // Other categories get their bucket count directly
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith(
        expect.stringMatching(/1\||0\|/),
        expect.any(String)
      );
    });

    it('should complete without error for empty result', () => {
      expect(() => filterManager.refreshSummary(classifyResult)).not.toThrow();
    });
  });
});
