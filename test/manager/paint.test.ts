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

  describe('paintSymbols', () => {
    it('should throw error when selector is empty', () => {
      const css = { color: 'red' };
      const symbols = new Set(['NIFTY']);

      expect(() => paintManager.paintSymbols('', symbols, css)).toThrow('Selector and CSS object are required');
    });

    it('should throw error when selector is null', () => {
      const css = { color: 'red' };
      const symbols = new Set(['NIFTY']);

      expect(() => paintManager.paintSymbols(null as any, symbols, css)).toThrow(
        'Selector and CSS object are required'
      );
    });

    it('should throw error when css is null', () => {
      const symbols = new Set(['NIFTY']);

      expect(() => paintManager.paintSymbols('.selector', symbols, null as any)).toThrow(
        'Selector and CSS object are required'
      );
    });

    it('should throw error when css is undefined', () => {
      const symbols = new Set(['NIFTY']);

      expect(() => paintManager.paintSymbols('.selector', symbols, undefined as any)).toThrow(
        'Selector and CSS object are required'
      );
    });

    it('should apply CSS to elements matching symbols', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY', 'BANKNIFTY']);
      const css = { color: 'red', 'font-weight': 'bold' };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should apply CSS with force flag ignoring symbolSet', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const css = { color: 'blue' };

      paintManager.paintSymbols(selector, symbols, css, true);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should handle null symbolSet with force flag', () => {
      const selector = '.symbol';
      const css = { color: 'green' };

      paintManager.paintSymbols(selector, null, css, true);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should handle empty symbolSet', () => {
      const selector = '.symbol';
      const symbols = new Set<string>();
      const css = { color: 'yellow' };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should apply complex CSS properties', () => {
      const selector = '.complex';
      const symbols = new Set(['RELIANCE']);
      const css = {
        'background-color': 'rgba(255, 0, 0, 0.5)',
        border: '2px solid black',
        padding: '10px',
        margin: '5px',
      };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    describe('filter function behavior', () => {
      let filterFunction: (this: HTMLElement, index: number, element: HTMLElement) => boolean;

      beforeEach(() => {
        const selector = '.test';
        const symbols = new Set(['NIFTY', 'BANKNIFTY']);
        const css = { color: 'red' };

        paintManager.paintSymbols(selector, symbols, css);
        filterFunction = mockJQueryElement.filter.mock.calls[0][0];
      });

      it('should return true when element innerHTML matches symbolSet', () => {
        const element = { innerHTML: 'NIFTY' } as HTMLElement;
        const result = filterFunction.call(element, 0, element);
        expect(result).toBe(true);
      });

      it('should return false when element innerHTML does not match symbolSet', () => {
        const element = { innerHTML: 'RELIANCE' } as HTMLElement;
        const result = filterFunction.call(element, 0, element);
        expect(result).toBe(false);
      });

      it('should return true with force flag regardless of symbolSet', () => {
        mockJQueryElement.filter.mockClear();
        paintManager.paintSymbols('.test', new Set(['NIFTY']), { color: 'red' }, true);

        const forceFilterFunction = mockJQueryElement.filter.mock.calls[0][0];
        const element = { innerHTML: 'RANDOM' } as HTMLElement;
        const result = forceFilterFunction.call(element, 0, element);
        expect(result).toBe(true);
      });

      it('should return false when symbolSet is null and no force flag', () => {
        mockJQueryElement.filter.mockClear();
        paintManager.paintSymbols('.test', null, { color: 'red' });

        const nullFilterFunction = mockJQueryElement.filter.mock.calls[0][0];
        const element = { innerHTML: 'NIFTY' } as HTMLElement;
        const result = nullFilterFunction.call(element, 0, element);
        expect(result).toBe(false);
      });
    });
  });

  describe('paintFlags', () => {
    beforeEach(() => {
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
    });

    it('should throw error when selector is empty', () => {
      const symbols = new Set(['NIFTY']);
      const color = 'red';
      const itemSelector = '.item';

      expect(() => paintManager.paintFlags('', symbols, color, itemSelector)).toThrow('Selector is required');
    });

    it('should throw error when selector is null', () => {
      const symbols = new Set(['NIFTY']);
      const color = 'red';
      const itemSelector = '.item';

      expect(() => paintManager.paintFlags(null as any, symbols, color, itemSelector)).toThrow('Selector is required');
    });

    it('should apply color to flags for matching symbols', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY', 'BANKNIFTY']);
      const color = 'red';
      const itemSelector = '.watchlist-item';

      paintManager.paintFlags(selector, symbols, color, itemSelector);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.closest).toHaveBeenCalledWith(itemSelector);
      expect(mockJQueryElement.find).toHaveBeenCalledWith(Constants.DOM.FLAGS.SYMBOL);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', color);
    });

    it('should apply color with force flag ignoring symbols', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const color = 'blue';
      const itemSelector = '.item';

      paintManager.paintFlags(selector, symbols, color, itemSelector, true);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockJQueryElement.closest).toHaveBeenCalledWith(itemSelector);
      expect(mockJQueryElement.find).toHaveBeenCalledWith(Constants.DOM.FLAGS.SYMBOL);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', color);
    });

    it('should handle null symbols with force flag', () => {
      const selector = '.symbol';
      const color = 'green';
      const itemSelector = '.item';

      paintManager.paintFlags(selector, null, color, itemSelector, true);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', color);
    });

    it('should handle empty symbols set', () => {
      const selector = '.symbol';
      const symbols = new Set<string>();
      const color = 'yellow';
      const itemSelector = '.item';

      paintManager.paintFlags(selector, symbols, color, itemSelector);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', color);
    });

    it('should use correct flag symbol selector from constants', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const color = 'purple';
      const itemSelector = '.item';

      paintManager.paintFlags(selector, symbols, color, itemSelector);

      expect(mockJQueryElement.find).toHaveBeenCalledWith(Constants.DOM.FLAGS.SYMBOL);
    });

    describe('filter function behavior for flags', () => {
      let filterFunction: (this: HTMLElement, index: number, element: HTMLElement) => boolean;

      beforeEach(() => {
        const selector = '.test';
        const symbols = new Set(['NIFTY', 'BANKNIFTY']);
        const color = 'red';
        const itemSelector = '.item';

        paintManager.paintFlags(selector, symbols, color, itemSelector);
        filterFunction = mockJQueryElement.filter.mock.calls[0][0];
      });

      it('should return true when element innerHTML matches symbols', () => {
        const element = { innerHTML: 'NIFTY' } as HTMLElement;
        const result = filterFunction.call(element, 0, element);
        expect(result).toBe(true);
      });

      it('should return false when element innerHTML does not match symbols', () => {
        const element = { innerHTML: 'RELIANCE' } as HTMLElement;
        const result = filterFunction.call(element, 0, element);
        expect(result).toBe(false);
      });
    });
  });

  describe('paintFNOMarking', () => {
    let mockNameElement: jest.Mocked<JQuery<HTMLElement>>;

    beforeEach(() => {
      mockNameElement = {
        css: jest.fn(),
      } as any;
    });

    it('should apply FNO CSS when enabled', () => {
      paintManager.paintFNOMarking(mockNameElement, true);

      expect(mockNameElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
    });

    it('should clear FNO CSS when disabled', () => {
      paintManager.paintFNOMarking(mockNameElement, false);

      expect(mockNameElement.css).toHaveBeenCalledWith('border-top-style', '');
      expect(mockNameElement.css).toHaveBeenCalledWith('border-width', '');
      expect(mockNameElement.css).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple enable/disable calls', () => {
      paintManager.paintFNOMarking(mockNameElement, true);
      paintManager.paintFNOMarking(mockNameElement, false);
      paintManager.paintFNOMarking(mockNameElement, true);

      expect(mockNameElement.css).toHaveBeenNthCalledWith(1, Constants.UI.COLORS.FNO_CSS);
      expect(mockNameElement.css).toHaveBeenNthCalledWith(2, 'border-top-style', '');
      expect(mockNameElement.css).toHaveBeenNthCalledWith(3, 'border-width', '');
      expect(mockNameElement.css).toHaveBeenNthCalledWith(4, Constants.UI.COLORS.FNO_CSS);
    });
  });

  describe('resetColors', () => {
    it('should reset symbol colors to default', () => {
      const selector = '.symbol';

      paintManager.resetColors(selector);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith({ color: Constants.UI.COLORS.DEFAULT });
    });

    it('should reset flag colors to default', () => {
      const selector = '.symbol';

      paintManager.resetColors(selector);

      expect(mockJQuery).toHaveBeenCalledTimes(2);
      expect(mockJQuery).toHaveBeenNthCalledWith(2, selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
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

    it('should force-reset screener symbols before painting', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paintArea(TickerArea.SCREENER);

      // Should call paintSymbols with force=true to reset all screener symbols
      expect(mockJQuery).toHaveBeenCalled();
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
