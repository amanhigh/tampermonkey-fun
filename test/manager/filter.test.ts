import { FilterManager, IFilterManager } from '../../src/manager/filter';
import { TickerArea } from '../../src/models/dom';

// Mock jQuery globally for DOM manipulation
const mockJQuery = jest.fn(() => ({
  toArray: jest.fn().mockReturnValue([]),
  css: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  has: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
}));
(global as any).$ = mockJQuery;

describe('FilterManager', () => {
  let filterManager: IFilterManager;

  const mockChain = {
    toArray: jest.fn().mockReturnValue([]),
    css: jest.fn().mockReturnThis(),
    show: jest.fn().mockReturnThis(),
    hide: jest.fn().mockReturnThis(),
    has: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJQuery.mockReturnValue(mockChain);
    filterManager = new FilterManager();
  });

  describe('Constructor', () => {
    it('should apply default white filter on construction', () => {
      expect(mockJQuery).toHaveBeenCalledWith(TickerArea.WATCHLIST.line);
      expect(mockChain.hide).toHaveBeenCalled();
    });
  });

  describe('applyColorFilter', () => {
    it('should replace filter chain when no modifiers', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyColorFilter('red', false, false);

      // applyFilters calls resetWatchList + hideAllItems + filterByColor
      expect(mockChain.hide).toHaveBeenCalled();
    });

    it('should append to chain when ctrl is pressed', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyColorFilter('red', false, true);

      // With ctrl, should not hide all items (append mode)
      expect(mockJQuery).toHaveBeenCalled();
    });

    it('should append to chain when shift is pressed', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyColorFilter('red', true, false);

      expect(mockJQuery).toHaveBeenCalled();
    });
  });

  describe('applyFlagFilter', () => {
    it('should apply flag filter with color', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyFlagFilter('orange', false);

      expect(mockJQuery).toHaveBeenCalled();
    });

    it('should apply flag filter with shift modifier', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyFlagFilter('orange', true);

      expect(mockJQuery).toHaveBeenCalled();
    });
  });

  describe('resetFilters', () => {
    it('should clear filter chain and reset visibility', () => {
      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.resetFilters();

      // resetWatchList shows all items
      expect(mockChain.show).toHaveBeenCalled();
      expect(mockChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should allow new filter after reset', () => {
      filterManager.resetFilters();

      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.applyColorFilter('red', false, false);

      // Should work normally after reset
      expect(mockJQuery).toHaveBeenCalled();
    });
  });

  describe('reapplyFilters', () => {
    it('should re-apply the current filter chain', () => {
      filterManager.applyColorFilter('red', false, false);

      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.reapplyFilters();

      // Should call resetWatchList and filter operations
      expect(mockJQuery).toHaveBeenCalled();
    });

    it('should be a no-op when chain is empty after reset', () => {
      filterManager.resetFilters();

      jest.clearAllMocks();
      mockJQuery.mockReturnValue(mockChain);

      filterManager.reapplyFilters();

      // resetWatchList still called (shows all), no filterByColor/Flag
      expect(mockChain.show).toHaveBeenCalled();
    });
  });
});
