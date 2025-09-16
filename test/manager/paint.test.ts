import { PaintManager, IPaintManager } from '../../src/manager/paint';
import { Constants } from '../../src/models/constant';

// Mock jQuery
const mockJQuery = jest.fn();
const mockJQueryElement = {
  filter: jest.fn(),
  css: jest.fn(),
  closest: jest.fn(),
  find: jest.fn(),
};

// Setup jQuery mock chain
mockJQuery.mockReturnValue(mockJQueryElement);
mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
mockJQueryElement.find.mockReturnValue(mockJQueryElement);

(global as any).$ = mockJQuery;

describe('PaintManager', () => {
  let paintManager: IPaintManager;

  beforeEach(() => {
    paintManager = new PaintManager();
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
      // Reset mock chain for each test
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

    it('should use correct FNO_CSS constant', () => {
      paintManager.paintFNOMarking(mockNameElement, true);

      expect(Constants.UI.COLORS.FNO_CSS).toEqual({
        'border-top-style': 'groove',
        'border-width': 'medium',
      });
      expect(mockNameElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
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

      // Second jQuery call for flag colors
      expect(mockJQuery).toHaveBeenCalledTimes(2);
      expect(mockJQuery).toHaveBeenNthCalledWith(2, selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should use correct constants for reset', () => {
      const selector = '.test';

      paintManager.resetColors(selector);

      expect(Constants.UI.COLORS.DEFAULT).toBe('white');
      expect(Constants.DOM.WATCHLIST.ITEM).toBeDefined();
      expect(Constants.DOM.FLAGS.SYMBOL).toBeDefined();
    });

    it('should handle multiple reset calls', () => {
      const selector1 = '.symbols1';
      const selector2 = '.symbols2';

      paintManager.resetColors(selector1);
      paintManager.resetColors(selector2);

      expect(mockJQuery).toHaveBeenCalledTimes(4); // 2 calls per reset
      expect(mockJQuery).toHaveBeenNthCalledWith(1, selector1);
      expect(mockJQuery).toHaveBeenNthCalledWith(2, selector1);
      expect(mockJQuery).toHaveBeenNthCalledWith(3, selector2);
      expect(mockJQuery).toHaveBeenNthCalledWith(4, selector2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle paintSymbols followed by resetColors', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const css = { color: 'red' };

      paintManager.paintSymbols(selector, symbols, css);
      paintManager.resetColors(selector);

      expect(mockJQuery).toHaveBeenCalledTimes(3); // 1 for paintSymbols + 2 for resetColors
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
      expect(mockJQueryElement.css).toHaveBeenCalledWith({ color: Constants.UI.COLORS.DEFAULT });
    });

    it('should handle paintFlags followed by resetColors', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const color = 'red';
      const itemSelector = '.item';

      paintManager.paintFlags(selector, symbols, color, itemSelector);
      paintManager.resetColors(selector);

      expect(mockJQuery).toHaveBeenCalledTimes(3); // 1 for paintFlags + 2 for resetColors
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', color);
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should handle multiple paint operations with different selectors', () => {
      const selector1 = '.symbols1';
      const selector2 = '.symbols2';
      const symbols1 = new Set(['NIFTY']);
      const symbols2 = new Set(['BANKNIFTY']);
      const css = { color: 'red' };

      paintManager.paintSymbols(selector1, symbols1, css);
      paintManager.paintSymbols(selector2, symbols2, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector1);
      expect(mockJQuery).toHaveBeenCalledWith(selector2);
      expect(mockJQueryElement.css).toHaveBeenCalledTimes(2);
    });

    it('should handle FNO marking with paint operations', () => {
      const mockNameElement = { css: jest.fn() } as any;
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const css = { color: 'blue' };

      paintManager.paintFNOMarking(mockNameElement, true);
      paintManager.paintSymbols(selector, symbols, css);
      paintManager.paintFNOMarking(mockNameElement, false);

      expect(mockNameElement.css).toHaveBeenCalledWith(Constants.UI.COLORS.FNO_CSS);
      expect(mockNameElement.css).toHaveBeenCalledWith('border-top-style', '');
      expect(mockNameElement.css).toHaveBeenCalledWith('border-width', '');
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle special characters in selectors', () => {
      const selector = '.symbol[data-test="special:value"]';
      const symbols = new Set(['NIFTY']);
      const css = { color: 'red' };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
    });

    it('should handle large symbol sets', () => {
      const selector = '.symbol';
      const symbols = new Set<string>();
      for (let i = 1; i <= 1000; i++) {
        symbols.add(`SYMBOL${i}`);
      }
      const css = { color: 'red' };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should handle symbols with special characters', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY-50', 'BANK@NSE', 'RELIANCE_EQ']);
      const css = { color: 'red' };

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQuery).toHaveBeenCalledWith(selector);
      expect(mockJQueryElement.filter).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty CSS object', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const css = {};

      paintManager.paintSymbols(selector, symbols, css);

      expect(mockJQueryElement.css).toHaveBeenCalledWith(css);
    });

    it('should handle null color in paintFlags', () => {
      const selector = '.symbol';
      const symbols = new Set(['NIFTY']);
      const color = null as any;
      const itemSelector = '.item';

      paintManager.paintFlags(selector, symbols, color, itemSelector);

      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', null);
    });
  });
});
