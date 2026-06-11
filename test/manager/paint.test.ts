import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { PaintManager, IPaintManager } from '../../src/manager/paint';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IRecentManager } from '../../src/manager/recent';
import { Constants } from '../../src/models/constant';
import { TickerCategory } from '../../src/models/category';
import { WatchCategoryId } from '../../src/models/watch';

// Mock jQuery
const mockJQueryElement: any = {
  css: jest.fn(),
  closest: jest.fn(),
  find: jest.fn(),
  length: 1,
};
mockJQueryElement[0] = { isConnected: true };
mockJQueryElement.filter = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.closest = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.find = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.add = jest.fn().mockReturnValue(mockJQueryElement);

const mockJQuery = jest.fn();
mockJQuery.mockReturnValue(mockJQueryElement);

(global as any).$ = mockJQuery;

describe('PaintManager', () => {
  let paintManager: IPaintManager;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  beforeEach(() => {
    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
      getCurrentExchange: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      getTickers: jest.fn().mockReturnValue(new Set()),
      isScreenerVisible: jest.fn().mockReturnValue(false),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    mockCategoryManager = {
      getTickerCategory: jest.fn().mockResolvedValue({ watch: undefined, flag: undefined, isFno: false }),
      getBatchCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    // Wire getBatchCategory to delegate to getTickerCategory so paint tests
    // continue to work without additional setup in each test.
    (mockCategoryManager.getBatchCategory as jest.Mock).mockImplementation(
      async (tickers: string[]) => {
        const map = new Map<string, TickerCategory>();
        for (const t of tickers) {
          map.set(t, await mockCategoryManager.getTickerCategory(t));
        }
        return map;
      },
    );

    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    paintManager = new PaintManager(mockDomManager, mockCategoryManager, mockRecentManager);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(paintManager).toBeDefined();
      expect(paintManager).toBeInstanceOf(PaintManager);
    });
  });

  describe('paint', () => {
    beforeEach(() => {
      mockJQueryElement.length = 1;
      mockJQueryElement.css.mockClear();
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, isFno: false });
    });

    it('should paint WATCHLIST area every time', async () => {
      await paintManager.paint();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
    });

    it('should paint SCREENER area when screener is visible', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);

      await paintManager.paint();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.SCREENER, TickerVisibility.ALL);
    });

    it('should skip SCREENER when screener is not visible', async () => {
      // isScreenerVisible already returns false by default
      await paintManager.paint();

      expect(mockDomManager.getTickers).not.toHaveBeenCalledWith(TickerArea.SCREENER, expect.anything());
    });

    it('should reset visual decals before repainting each area', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);

      await paintManager.paint();

      // Reset happens via jQuery css calls on the symbol selector
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL);
    });

    it('should repaint header after full paint', async () => {
      mockDomManager.getTicker.mockReturnValue('HEADER_TICKER');

      await paintManager.paint();

      // Header reads the current ticker
      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should paint symbol, flag, and FNO for each ticker', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
        flag: { id: 'SIDEWAYS' as any, color: 'orange', label: 'Sideways', update: { trend: 'SIDEWAYS' } },
        isFno: true,
      });

      await paintManager.paint();

      // Colors applied directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
      // FNO border applied
      expect(mockJQueryElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
    });
  });

  describe('paintTickers', () => {
    beforeEach(() => {
      mockJQueryElement.length = 1;
      mockJQueryElement.css.mockClear();
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
      mockDomManager.getTickers.mockReturnValue(new Set());
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, isFno: false });
    });

    it('should paint tickers in WATCHLIST area', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockCategoryManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL') return { watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null }, flag: undefined, isFno: false };
        return { watch: undefined, flag: undefined, isFno: false };
      });
      mockDomManager.isScreenerVisible.mockReturnValue(false);

      await paintManager.paintTickers(['AAPL', 'GOOG']);

      // Should find tickers via filter (once per ticker per area)
      expect(mockJQueryElement.filter).toHaveBeenCalled();
      // AAPL gets painted red, GOOG stays default
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
    });

    it('should also paint tickers in SCREENER when screener visible', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL']));

      await paintManager.paintTickers(['AAPL']);

      // Should have been called for WATCHLIST and SCREENER ticker lookups
      expect(mockJQueryElement.filter).toHaveBeenCalled();
    });

    it('should repaint header after targeted update', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockDomManager.getTickers.mockReturnValue(new Set(['CURRENT']));

      await paintManager.paintTickers(['CURRENT']);

      // Header reset + paint uses css calls
      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should skip missing tickers without error', async () => {
      mockJQueryElement.length = 0;
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);

      await paintManager.paintTickers(['MISSING']);

      // Should not crash
    });

    it('should no-op on empty array', async () => {
      await paintManager.paintTickers([]);

      expect(mockJQueryElement.filter).not.toHaveBeenCalled();
    });
  });

  describe('summarizeBuckets', () => {
    beforeEach(() => {
      mockJQueryElement.css.mockClear();
    });

    it('should summarize WATCHLIST buckets without painting DOM', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockCategoryManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL') return { watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null }, flag: undefined, isFno: false };
        return { watch: undefined, flag: undefined, isFno: false };
      });

      const result = await paintManager.summarizeBuckets();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(result.buckets.get(WatchCategoryId.READY)).toBe(1);
      expect(result.uncategorizedCount).toBe(1);
      expect(mockJQuery).not.toHaveBeenCalled();
    });

    it('should handle empty area without error', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      const result = await paintManager.summarizeBuckets();

      expect(result.buckets.size).toBe(0);
      expect(result.uncategorizedCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty ticker set in paint', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paint();

      // No crash
    });
  });
});
