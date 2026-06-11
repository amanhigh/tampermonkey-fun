import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { PaintManager, IPaintManager } from '../../src/manager/paint';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { IDomManager } from '../../src/manager/dom';
import { IFnoManager } from '../../src/manager/fno';
import { IRecentManager } from '../../src/manager/recent';
import { Constants } from '../../src/models/constant';
import { WatchCategoryId } from '../../src/models/watch';
import { FlagCategoryId } from '../../src/models/flag';

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
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockFlagManager: jest.Mocked<IFlagManager>;
  let mockFnoManager: jest.Mocked<IFnoManager>;
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

    mockWatchManager = {
      getTickerCategory: jest.fn().mockResolvedValue(undefined),
      recordCategory: jest.fn(),
    } as unknown as jest.Mocked<IWatchManager>;

    mockFlagManager = {
      getTickerCategory: jest.fn().mockResolvedValue(undefined),
      recordCategory: jest.fn(),
    } as unknown as jest.Mocked<IFlagManager>;

    mockFnoManager = {
      isFno: jest.fn().mockReturnValue(false),
      getAllFnoTickers: jest.fn().mockReturnValue(new Set()),
    } as unknown as jest.Mocked<IFnoManager>;

    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    paintManager = new PaintManager(mockDomManager, mockWatchManager, mockFlagManager, mockFnoManager, mockRecentManager);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(paintManager).toBeDefined();
      expect(paintManager).toBeInstanceOf(PaintManager);
    });
  });

  describe('resetArea', () => {
    beforeEach(() => {
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
    });

    it('should reset symbol colors to default for the given panel', () => {
      paintManager.resetArea(TickerArea.WATCHLIST);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should reset flag colors to default for the given panel', () => {
      paintManager.resetArea(TickerArea.WATCHLIST);

      expect(mockJQueryElement.closest).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.ITEM);
      expect(mockJQueryElement.find).toHaveBeenCalledWith(Constants.DOM.FLAGS.SYMBOL);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should clear F&O border styles for the given panel', () => {
      paintManager.resetArea(TickerArea.WATCHLIST);

      expect(mockJQueryElement.css).toHaveBeenCalledWith('border-top-style', '');
      expect(mockJQueryElement.css).toHaveBeenCalledWith('border-width', '');
    });

    it('should accept SCREENER panel selector', () => {
      paintManager.resetArea(TickerArea.SCREENER);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL);
    });
  });

  describe('paintArea', () => {
    beforeEach(() => {
      mockJQueryElement.length = 1;
      mockJQueryElement.css.mockClear();
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
    });

    it('should read tickers from DomManager for WATCHLIST', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY', 'BANKNIFTY']));
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);

      await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
    });

    it('should call getTickerCategory for watch AND flag categories', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockWatchManager.getTickerCategory.mockResolvedValue({ id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null });
      mockFlagManager.getTickerCategory.mockResolvedValue({ id: FlagCategoryId.SIDEWAYS, color: 'orange', label: 'Sideways' } as any);

      await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith('NIFTY');
      expect(mockFlagManager.getTickerCategory).toHaveBeenCalledWith('NIFTY');
    });

    it('should call resetArea before painting for SCREENER', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paintArea(TickerArea.SCREENER);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL);
    });

    it('should call resetArea before painting for WATCHLIST', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
    });

    it('should paint symbol, flag, and FNO using direct DOM lookup', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockWatchManager.getTickerCategory.mockResolvedValue({
        id: WatchCategoryId.READY,
        color: 'red',
        label: 'Ready',
        recordUpdate: null,
      });
      mockFlagManager.getTickerCategory.mockResolvedValue({
        id: FlagCategoryId.SIDEWAYS,
        color: 'orange',
        label: 'Sideways',
      } as any);
      mockFnoManager.isFno.mockReturnValue(true);

      await paintManager.paintArea(TickerArea.WATCHLIST);

      // Symbol lookup via jQuery filter
      expect(mockJQueryElement.filter).toHaveBeenCalled();
      // Colors applied directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
      // FNO border applied directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
    });

    it('should not return BucketSummary', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));

      const result = await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(result).toBeUndefined();
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
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
    });

    it('should paint tickers in WATCHLIST area', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockWatchManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL') return { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null };
        return undefined;
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

    it('should return BucketSummary without painting DOM', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockWatchManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL') return { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null };
        return undefined;
      });

      const result = await paintManager.summarizeBuckets(TickerArea.WATCHLIST);

      expect(result.buckets.get(WatchCategoryId.READY)).toBe(1);
      expect(result.uncategorizedCount).toBe(1);
      expect(mockJQuery).not.toHaveBeenCalled();
    });

    it('should handle empty area without error', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      const result = await paintManager.summarizeBuckets(TickerArea.WATCHLIST);

      expect(result.buckets.size).toBe(0);
      expect(result.uncategorizedCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty ticker set in paintArea', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paintArea(TickerArea.WATCHLIST);

      // No crash
    });
  });
});
