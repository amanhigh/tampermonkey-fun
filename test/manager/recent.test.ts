import { RecentManager, IRecentManager } from '../../src/manager/recent';
import { IRecentTickerRepo } from '../../src/repo/recent';
import { IPaintManager } from '../../src/manager/paint';
import { Constants } from '../../src/models/constant';

describe('RecentManager', () => {
  let recentManager: IRecentManager;
  let mockRecentRepo: jest.Mocked<IRecentTickerRepo>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock RecentTickerRepo
    mockRecentRepo = {
      add: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      info: jest.fn(),
    } as jest.Mocked<IRecentTickerRepo>;

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as jest.Mocked<IPaintManager>;

    recentManager = new RecentManager(mockRecentRepo, mockPaintManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(recentManager).toBeDefined();
      expect(recentManager).toBeInstanceOf(RecentManager);
    });
  });

  describe('addTicker', () => {
    it('should add ticker to recent repository', () => {
      const ticker = 'NSE:RELIANCE';

      recentManager.addTicker(ticker);

      expect(mockRecentRepo.add).toHaveBeenCalledWith(ticker);
      expect(mockRecentRepo.add).toHaveBeenCalledTimes(1);
    });

    it('should handle empty ticker string', () => {
      const ticker = '';

      recentManager.addTicker(ticker);

      expect(mockRecentRepo.add).toHaveBeenCalledWith(ticker);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['NSE:RELIANCE', 'NSE:TCS', 'NSE:HDFC'];

      tickers.forEach((ticker) => recentManager.addTicker(ticker));

      expect(mockRecentRepo.add).toHaveBeenCalledTimes(3);
      tickers.forEach((ticker) => {
        expect(mockRecentRepo.add).toHaveBeenCalledWith(ticker);
      });
    });
  });

  describe('isRecent', () => {
    it('should return true when ticker exists in recent repo', () => {
      const ticker = 'NSE:TCS';
      mockRecentRepo.has.mockReturnValue(true);

      const result = recentManager.isRecent(ticker);

      expect(result).toBe(true);
      expect(mockRecentRepo.has).toHaveBeenCalledWith(ticker);
    });

    it('should return false when ticker does not exist in recent repo', () => {
      const ticker = 'NSE:UNKNOWN';
      mockRecentRepo.has.mockReturnValue(false);

      const result = recentManager.isRecent(ticker);

      expect(result).toBe(false);
      expect(mockRecentRepo.has).toHaveBeenCalledWith(ticker);
    });

    it('should handle empty ticker string', () => {
      const ticker = '';
      mockRecentRepo.has.mockReturnValue(false);

      const result = recentManager.isRecent(ticker);

      expect(result).toBe(false);
      expect(mockRecentRepo.has).toHaveBeenCalledWith(ticker);
    });
  });

  describe('clearRecent', () => {
    it('should clear all recent tickers from repository', () => {
      recentManager.clearRecent();

      expect(mockRecentRepo.clear).toHaveBeenCalledTimes(1);
    });

    it('should not throw error when repository is already empty', () => {
      expect(() => recentManager.clearRecent()).not.toThrow();
      expect(mockRecentRepo.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('paintRecent', () => {
    it('should paint recent tickers with correct color and selector', () => {
      const recentTickers = new Set(['NSE:RELIANCE', 'NSE:TCS']);
      mockRecentRepo.getAll.mockReturnValue(recentTickers);

      recentManager.paintRecent();

      expect(mockRecentRepo.getAll).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL, recentTickers, {
        color: Constants.UI.COLORS.LIST[1],
      });
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledTimes(1);
    });

    it('should paint empty set when no recent tickers', () => {
      const emptySet = new Set<string>();
      mockRecentRepo.getAll.mockReturnValue(emptySet);

      recentManager.paintRecent();

      expect(mockRecentRepo.getAll).toHaveBeenCalledTimes(1);
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL, emptySet, {
        color: Constants.UI.COLORS.LIST[1],
      });
    });

    it('should use correct screener selector from constants', () => {
      const recentTickers = new Set(['NSE:HDFC']);
      mockRecentRepo.getAll.mockReturnValue(recentTickers);

      recentManager.paintRecent();

      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(
        Constants.DOM.SCREENER.SYMBOL,
        expect.any(Set),
        expect.any(Object)
      );
    });

    it('should use second color from color list (index 1)', () => {
      const recentTickers = new Set(['NSE:WIPRO']);
      mockRecentRepo.getAll.mockReturnValue(recentTickers);

      recentManager.paintRecent();

      const expectedColor = Constants.UI.COLORS.LIST[1];
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(expect.any(String), expect.any(Set), {
        color: expectedColor,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow of adding, checking, and painting', () => {
      const ticker = 'NSE:INFY';
      const recentSet = new Set([ticker]);

      // Add ticker
      recentManager.addTicker(ticker);

      // Mock repo state after addition
      mockRecentRepo.has.mockReturnValue(true);
      mockRecentRepo.getAll.mockReturnValue(recentSet);

      // Check if recent
      const isRecent = recentManager.isRecent(ticker);

      // Paint recent
      recentManager.paintRecent();

      // Verify all operations
      expect(mockRecentRepo.add).toHaveBeenCalledWith(ticker);
      expect(isRecent).toBe(true);
      expect(mockRecentRepo.has).toHaveBeenCalledWith(ticker);
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL, recentSet, {
        color: Constants.UI.COLORS.LIST[1],
      });
    });

    it('should handle multiple tickers with clear operation', () => {
      const tickers = ['NSE:RELIANCE', 'NSE:TCS', 'NSE:HDFC'];

      // Add multiple tickers
      tickers.forEach((ticker) => recentManager.addTicker(ticker));

      // Clear all
      recentManager.clearRecent();

      // Mock empty state after clear
      mockRecentRepo.has.mockReturnValue(false);
      mockRecentRepo.getAll.mockReturnValue(new Set());

      // Check if any ticker is still recent
      const isAnyRecent = tickers.some((ticker) => recentManager.isRecent(ticker));

      expect(mockRecentRepo.add).toHaveBeenCalledTimes(3);
      expect(mockRecentRepo.clear).toHaveBeenCalledTimes(1);
      expect(isAnyRecent).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle repository add errors gracefully', () => {
      const error = new Error('Repository add failed');
      mockRecentRepo.add.mockImplementation(() => {
        throw error;
      });

      expect(() => recentManager.addTicker('NSE:TEST')).toThrow('Repository add failed');
    });

    it('should handle repository has errors gracefully', () => {
      const error = new Error('Repository has failed');
      mockRecentRepo.has.mockImplementation(() => {
        throw error;
      });

      expect(() => recentManager.isRecent('NSE:TEST')).toThrow('Repository has failed');
    });

    it('should handle repository clear errors gracefully', () => {
      const error = new Error('Repository clear failed');
      mockRecentRepo.clear.mockImplementation(() => {
        throw error;
      });

      expect(() => recentManager.clearRecent()).toThrow('Repository clear failed');
    });

    it('should handle paint manager errors gracefully', () => {
      const error = new Error('Paint failed');
      mockRecentRepo.getAll.mockReturnValue(new Set(['NSE:TEST']));
      mockPaintManager.paintSymbols.mockImplementation(() => {
        throw error;
      });

      expect(() => recentManager.paintRecent()).toThrow('Paint failed');
      expect(mockRecentRepo.getAll).toHaveBeenCalled();
    });

    it('should handle repository getAll errors gracefully', () => {
      const error = new Error('Repository getAll failed');
      mockRecentRepo.getAll.mockImplementation(() => {
        throw error;
      });

      expect(() => recentManager.paintRecent()).toThrow('Repository getAll failed');
    });
  });
});
