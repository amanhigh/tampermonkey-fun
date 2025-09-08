import { StyleManager, IStyleManager } from '../../src/manager/style';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { WaitUtil } from '../../src/util/wait';
import { TimeFrameConfig } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';

// Mock jQuery
const mockJQueryElement = {
  length: 1,
  click: jest.fn().mockReturnThis(),
};
const mockJQuery = jest.fn(() => mockJQueryElement);
(global as any).$ = mockJQuery;

describe('StyleManager', () => {
  let styleManager: IStyleManager;
  let mockWaitUtil: jest.Mocked<WaitUtil>;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset jQuery mock to default working state
    mockJQueryElement.length = 1;
    mockJQueryElement.click = jest.fn().mockReturnThis();
    mockJQuery.mockReturnValue(mockJQueryElement);

    // Mock WaitUtil
    mockWaitUtil = {
      waitEE: jest.fn(),
      waitJEE: jest.fn(),
      waitClick: jest.fn(),
      waitJClick: jest.fn(),
      waitInput: jest.fn(),
    } as jest.Mocked<WaitUtil>;

    // Mock TimeFrameManager
    mockTimeFrameManager = {
      applyTimeFrame: jest.fn(),
      getCurrentTimeFrameConfig: jest.fn(),
    };

    styleManager = new StyleManager(mockWaitUtil, mockTimeFrameManager);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(styleManager).toBeDefined();
      expect(styleManager).toBeInstanceOf(StyleManager);
    });
  });

  describe('selectToolbar', () => {
    it('should select toolbar at valid index', () => {
      const index = 3;
      mockJQuery.mockReturnValue(mockJQueryElement);
      mockJQueryElement.length = 1;

      styleManager.selectToolbar(index);

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);
    });

    it('should throw error for negative index', () => {
      const index = -1;

      expect(() => styleManager.selectToolbar(index)).toThrow(`Invalid toolbar index: ${index}`);
      expect(mockJQuery).not.toHaveBeenCalled();
    });

    it('should throw error for index greater than 10', () => {
      const index = 11;

      expect(() => styleManager.selectToolbar(index)).toThrow(`Invalid toolbar index: ${index}`);
      expect(mockJQuery).not.toHaveBeenCalled();
    });

    it('should throw error when toolbar not found', () => {
      const index = 5;
      mockJQuery.mockReturnValue({ ...mockJQueryElement, length: 0 });

      expect(() => styleManager.selectToolbar(index)).toThrow(`Toolbar with index ${index} not found`);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
    });

    it('should handle boundary values correctly', () => {
      // Ensure element is found for both tests
      mockJQueryElement.length = 1;

      // Test index 0 (minimum valid)
      styleManager.selectToolbar(0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(0)`);

      jest.clearAllMocks();
      // Reset mock to return element again
      mockJQuery.mockReturnValue(mockJQueryElement);

      // Test index 10 (maximum valid)
      styleManager.selectToolbar(10);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(10)`);
    });
  });

  describe('applyZoneStyle', () => {
    it('should apply zone style with current timeframe style', () => {
      const zoneType = 'DZ';
      const mockTimeFrameConfig = new TimeFrameConfig('D', 'I', 2);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      styleManager.applyZoneStyle(zoneType);

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should combine different timeframe styles with zone types', () => {
      // Test with different timeframe config
      const zoneType = 'SZ';
      const mockTimeFrameConfig = new TimeFrameConfig('W', 'H', 3);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      styleManager.applyZoneStyle(zoneType);

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should handle empty zone type', () => {
      const zoneType = '';
      const mockTimeFrameConfig = new TimeFrameConfig('M', 'VH', 4);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      styleManager.applyZoneStyle(zoneType);

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });
  });

  describe('applyStyle', () => {
    it('should apply style with correct selectors', () => {
      const styleName = 'IDZ';

      styleManager.applyStyle(styleName);

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));

      // Test the callback function
      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      if (callback) {
        callback();
        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(
          `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${styleName})`
        );
      }
    });

    it('should handle special characters in style name', () => {
      const styleName = 'VH-DZ';

      styleManager.applyStyle(styleName);

      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      if (callback) {
        callback();
        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(
          `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${styleName})`
        );
      }
    });

    it('should handle empty style name', () => {
      const styleName = '';

      styleManager.applyStyle(styleName);

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));

      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      if (callback) {
        callback();
        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains()`);
      }
    });
  });

  describe('clearAll', () => {
    it('should clear all drawings with correct sequence', () => {
      styleManager.clearAll();

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_ARROW, expect.any(Function));

      // Test the callback function
      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      if (callback) {
        callback();
        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_DRAWING);
      }
    });

    it('should use correct selectors from constants', () => {
      styleManager.clearAll();

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_ARROW, expect.any(Function));

      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      if (callback) {
        callback();
        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_DRAWING);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow of selecting toolbar and applying style', () => {
      const toolbarIndex = 2;
      const styleName = 'HDZ';

      // Ensure element is found
      mockJQueryElement.length = 1;

      // Select toolbar
      styleManager.selectToolbar(toolbarIndex);

      // Apply style
      styleManager.applyStyle(styleName);

      // Verify toolbar selection
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${toolbarIndex})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);

      // Verify style application
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should handle zone style application workflow', () => {
      const zoneType = Constants.TRADING.ZONES.DEMAND;
      const mockTimeFrameConfig = new TimeFrameConfig('D', 'I', 2);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      styleManager.applyZoneStyle(zoneType);

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalled();
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should handle clear all followed by style application', () => {
      const styleName = 'TST';

      // Clear all drawings
      styleManager.clearAll();

      // Apply new style
      styleManager.applyStyle(styleName);

      // Verify both operations
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_ARROW, expect.any(Function));
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Reset mocks for error handling tests
      jest.clearAllMocks();
    });

    it('should handle waitUtil errors gracefully in applyStyle', () => {
      const error = new Error('WaitUtil failed');
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.applyStyle('TEST')).toThrow('WaitUtil failed');
    });

    it('should handle waitUtil errors gracefully in clearAll', () => {
      const error = new Error('Clear all failed');
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.clearAll()).toThrow('Clear all failed');
    });

    it('should handle timeframe manager errors gracefully', () => {
      const error = new Error('TimeFrame config failed');
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.applyZoneStyle('DZ')).toThrow('TimeFrame config failed');
    });

    it('should handle jQuery selector errors gracefully', () => {
      const error = new Error('jQuery failed');
      mockJQuery.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.selectToolbar(1)).toThrow('jQuery failed');
    });

    it('should handle click errors gracefully', () => {
      const error = new Error('Click failed');
      // First ensure jQuery returns an element
      const mockElement = { ...mockJQueryElement, length: 1 };
      mockElement.click = jest.fn(() => {
        throw error;
      });
      mockJQuery.mockReturnValue(mockElement);

      expect(() => styleManager.selectToolbar(1)).toThrow('Click failed');
    });

    it('should handle callback errors in applyStyle', () => {
      const error = new Error('Style callback failed');

      styleManager.applyStyle('TEST');

      // Get the callback and test it throws error
      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      if (callback) {
        expect(() => callback()).toThrow('Style callback failed');
      }
    });

    it('should handle callback errors in clearAll', () => {
      const error = new Error('Clear callback failed');

      styleManager.clearAll();

      // Get the callback and test it throws error
      const callback = mockWaitUtil.waitJClick.mock.calls[0][1];
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      if (callback) {
        expect(() => callback()).toThrow('Clear callback failed');
      }
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      // Ensure clean state for edge case tests
      jest.clearAllMocks();
      mockJQueryElement.length = 1;
      mockJQueryElement.click = jest.fn().mockReturnThis();
      mockJQuery.mockReturnValue(mockJQueryElement);
    });

    it('should handle multiple rapid toolbar selections', () => {
      for (let i = 0; i <= 10; i++) {
        styleManager.selectToolbar(i);
      }

      expect(mockJQuery).toHaveBeenCalledTimes(11);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(11);
    });

    it('should handle multiple style applications', () => {
      const styles = ['IDZ', 'HSZ', 'VHDZ', 'TST'];

      styles.forEach((style) => styleManager.applyStyle(style));

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(styles.length);
    });

    it('should handle zone style with various timeframe configurations', () => {
      const configs = [
        new TimeFrameConfig('D', 'I', 1),
        new TimeFrameConfig('W', 'H', 2),
        new TimeFrameConfig('M', 'VH', 3),
      ];

      configs.forEach((config) => {
        mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValueOnce(config);
        styleManager.applyZoneStyle('DZ');
      });

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(3);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(3);
    });
  });
});
