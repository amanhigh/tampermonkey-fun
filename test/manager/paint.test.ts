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
      // Default mocks
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

      const result = await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(result.buckets.size).toBe(0);
      expect(result.uncategorized.size).toBe(2);
    });

    it('should build CategoryBuckets from watch categories', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['READY_A', 'INDEX_A']));
      mockWatchManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'READY_A') return { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null };
        if (ticker === 'INDEX_A') return { id: WatchCategoryId.INDEX, color: 'brown', label: 'Index', recordUpdate: null };
        return undefined;
      });
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);

      const result = await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(result.buckets.get(WatchCategoryId.READY)?.has('READY_A')).toBe(true);
      expect(result.buckets.get(WatchCategoryId.INDEX)?.has('INDEX_A')).toBe(true);
      expect(result.uncategorized.size).toBe(0);
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

      // resetArea uses area.getSymbolSelector() to reset all elements
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.SYMBOL);
    });

    it('should call resetArea before painting for WATCHLIST', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paintArea(TickerArea.WATCHLIST);

      // resetArea uses area.getSymbolSelector() to reset all elements
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.SYMBOL);
    });

    it('should paint symbol, flag, and FNO using direct DOM lookup (no cache)', async () => {
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

      const result = await paintManager.paintArea(TickerArea.WATCHLIST);

      // Symbol lookup via jQuery filter
      expect(mockJQueryElement.filter).toHaveBeenCalled();
      // Flag lookup via closest+find from the symbol element (not via async cache)
      expect(mockJQueryElement.closest).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.ITEM);
      expect(mockJQueryElement.find).toHaveBeenCalledWith(Constants.DOM.FLAGS.SYMBOL);
      // Colors applied directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
      // FNO border applied directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
      // Buckets still built correctly
      expect(result.buckets.get(WatchCategoryId.READY)?.has('NIFTY')).toBe(true);
    });
  });

  describe('paintHeader', () => {
    beforeEach(() => {
      mockJQueryElement.css.mockClear();
      mockJQuery.mockReturnValue(mockJQueryElement);
    });

    it('should get current ticker from DomManager', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');

      await paintManager.paintHeader();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should reset name, flag, and exchange to default', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);

      await paintManager.paintHeader();

      // Name, flag, exchange all reset to default
      const calls = mockJQueryElement.css.mock.calls.filter(([prop]: [string]) => prop === 'color' || typeof prop === 'object');
      expect(calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should paint name with watch category color', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockWatchManager.getTickerCategory.mockResolvedValue({ id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null });
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);

      await paintManager.paintHeader();

      // Name should have 'red' color applied after default
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
    });

    it('should paint flag and exchange with flag category color', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue({ id: FlagCategoryId.SIDEWAYS, color: 'orange', label: 'Sideways' } as any);

      await paintManager.paintHeader();

      // Flag and exchange should have 'orange' color
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
    });

    it('should apply FNO marking on header name', async () => {
      mockDomManager.getTicker.mockReturnValue('FNO_TICKER');
      mockFnoManager.isFno.mockReturnValue(true);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);

      await paintManager.paintHeader();

      // FNO CSS should be applied to the name element
      expect(mockJQueryElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
    });
  });

  describe('edge cases', () => {
    it('should handle empty ticker set in paintArea', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      const result = await paintManager.paintArea(TickerArea.WATCHLIST);

      expect(result.buckets.size).toBe(0);
      expect(result.uncategorized.size).toBe(0);
    });
  });
});
