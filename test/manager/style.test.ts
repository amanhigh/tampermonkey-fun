import { StyleManager, IStyleManager } from '../../src/manager/style';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { IWaitUtil } from '../../src/util/wait';
import { Constants } from '../../src/models/constant';
import { TimeFrameConfig } from '../../src/models/trading';

// Mock jQuery
const mockJQuery = jest.fn();
const mockJQueryElement = {
  click: jest.fn(),
  length: 1,
};

mockJQuery.mockReturnValue(mockJQueryElement);
(global as any).$ = mockJQuery;

describe('StyleManager', () => {
  let styleManager: IStyleManager;
  let mockWaitUtil: jest.Mocked<IWaitUtil>;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WaitUtil
    mockWaitUtil = {
      waitEE: jest.fn(),
      waitJEE: jest.fn(),
      waitClick: jest.fn(),
      waitJClick: jest.fn(),
      waitInput: jest.fn(),
    };

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
    beforeEach(() => {
      mockJQueryElement.length = 1;
    });

    it('should click toolbar at valid index', () => {
      const index = 3;

      styleManager.selectToolbar(index);

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);
    });

    it('should handle index 0', () => {
      const index = 0;

      styleManager.selectToolbar(index);

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);
    });

    it('should handle maximum valid index', () => {
      const index = 10;

      styleManager.selectToolbar(index);

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);
    });

    it('should throw error for negative index', () => {
      const index = -1;

      expect(() => styleManager.selectToolbar(index)).toThrow('Invalid toolbar index: -1');
      expect(mockJQuery).not.toHaveBeenCalled();
      expect(mockJQueryElement.click).not.toHaveBeenCalled();
    });

    it('should throw error for index greater than 10', () => {
      const index = 11;

      expect(() => styleManager.selectToolbar(index)).toThrow('Invalid toolbar index: 11');
      expect(mockJQuery).not.toHaveBeenCalled();
      expect(mockJQueryElement.click).not.toHaveBeenCalled();
    });

    it('should throw error when toolbar element not found', () => {
      const index = 5;
      mockJQueryElement.length = 0;

      expect(() => styleManager.selectToolbar(index)).toThrow('Toolbar with index 5 not found');
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
      expect(mockJQueryElement.click).not.toHaveBeenCalled();
    });
  });

  describe('applyZoneStyle', () => {
    it('should apply zone style with current timeframe', () => {
      const zoneType = 'DZ';
      const mockTimeFrameConfig = new TimeFrameConfig('D', 'I', 2);

      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      styleManager.applyZoneStyle(zoneType);

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should combine style ID with zone type correctly', () => {
      const zoneType = 'SZ';
      const mockTimeFrameConfig = new TimeFrameConfig('WK', 'H', 3);

      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      // Mock the callback execution
      let callbackFunction: (() => void) | undefined;
      mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
        if (callback) {
          callbackFunction = callback;
        }
      });

      styleManager.applyZoneStyle(zoneType);

      // Execute the captured callback
      if (callbackFunction) {
        callbackFunction();
      }

      // Verify the combined style name 'HSZ' is used
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(2, `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(HSZ)`);
    });

    it('should handle different zone types', () => {
      const testCases = [
        { zoneType: 'DZ', style: 'VH', expected: 'VHDZ' },
        { zoneType: 'SZ', style: 'I', expected: 'ISZ' },
        { zoneType: 'CUSTOM', style: 'T', expected: 'TCUSTOM' },
      ];

      testCases.forEach(({ zoneType, style, expected }) => {
        mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(new TimeFrameConfig('TEST', style, 1));

        let callbackFunction: (() => void) | undefined;
        mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
          if (callback) {
            callbackFunction = callback;
          }
        });

        styleManager.applyZoneStyle(zoneType);

        if (callbackFunction) {
          callbackFunction();
        }

        expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(
          `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${expected})`
        );

        jest.clearAllMocks();
      });
    });
  });

  describe('applyStyle', () => {
    it('should apply style with given name', () => {
      const styleName = 'IDZ';

      styleManager.applyStyle(styleName);

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should call waitJClick with correct style item selector', () => {
      const styleName = 'HSZ';

      let callbackFunction: (() => void) | undefined;
      mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
        if (callback) {
          callbackFunction = callback;
        }
      });

      styleManager.applyStyle(styleName);

      // Execute the captured callback
      if (callbackFunction) {
        callbackFunction();
      }

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(2);
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(1, Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(
        2,
        `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${styleName})`
      );
    });

    it('should handle empty style name', () => {
      const styleName = '';

      let callbackFunction: (() => void) | undefined;
      mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
        if (callback) {
          callbackFunction = callback;
        }
      });

      styleManager.applyStyle(styleName);

      if (callbackFunction) {
        callbackFunction();
      }

      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(2, `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains()`);
    });
  });

  describe('clearAll', () => {
    it('should execute clear all operation with correct selectors', () => {
      styleManager.clearAll();

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_ARROW, expect.any(Function));
    });

    it('should call delete drawing in callback', () => {
      let callbackFunction: (() => void) | undefined;
      mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
        if (callback) {
          callbackFunction = callback;
        }
      });

      styleManager.clearAll();

      // Execute the captured callback
      if (callbackFunction) {
        callbackFunction();
      }

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(2);
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(
        1,
        Constants.DOM.SIDEBAR.DELETE_ARROW,
        expect.any(Function)
      );
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(2, Constants.DOM.SIDEBAR.DELETE_DRAWING);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete style application workflow', () => {
      const zoneType = 'DZ';
      const mockTimeFrameConfig = new TimeFrameConfig('D', 'I', 2);

      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(mockTimeFrameConfig);

      // Mock callback execution for style application
      let styleCallbacks: Array<(() => void) | undefined> = [];
      mockWaitUtil.waitJClick.mockImplementation((_, callback) => {
        styleCallbacks.push(callback);
      });

      // Apply zone style
      styleManager.applyZoneStyle(zoneType);

      // Execute all callbacks
      styleCallbacks.forEach((callback) => {
        if (callback) callback();
      });

      // Verify complete flow
      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(2);
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(1, Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
      expect(mockWaitUtil.waitJClick).toHaveBeenNthCalledWith(2, `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(IDZ)`);
    });

    it('should handle toolbar selection and style application', () => {
      const toolbarIndex = 4;
      const styleName = 'VHDZ';

      // Ensure element is found
      mockJQueryElement.length = 1;

      // First select toolbar
      styleManager.selectToolbar(toolbarIndex);

      // Then apply style
      styleManager.applyStyle(styleName);

      // Verify toolbar selection
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.TOOLBARS.MAIN}:nth(${toolbarIndex})`);
      expect(mockJQueryElement.click).toHaveBeenCalledTimes(1);

      // Verify style application
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
    });

    it('should handle clear all after style operations', () => {
      const styleName = 'TEST';

      // Apply style first
      styleManager.applyStyle(styleName);

      // Then clear all
      styleManager.clearAll();

      // Verify both operations
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.TOOLBARS.STYLE, expect.any(Function));
      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.SIDEBAR.DELETE_ARROW, expect.any(Function));
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Reset jQuery mock before each error test
      mockJQuery.mockClear();
      mockJQuery.mockReturnValue(mockJQueryElement);
      mockJQueryElement.length = 1;
    });

    it('should handle jQuery selector errors in selectToolbar', () => {
      const error = new Error('jQuery selector failed');
      mockJQuery.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.selectToolbar(5)).toThrow('jQuery selector failed');
    });

    it('should handle timeframe manager errors in applyZoneStyle', () => {
      const error = new Error('TimeFrame manager failed');
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.applyZoneStyle('DZ')).toThrow('TimeFrame manager failed');
    });

    it('should handle waitUtil errors in applyStyle', () => {
      const error = new Error('WaitUtil failed');
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.applyStyle('TEST')).toThrow('WaitUtil failed');
    });

    it('should handle waitUtil errors in clearAll', () => {
      const error = new Error('WaitUtil clearAll failed');
      mockWaitUtil.waitJClick.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.clearAll()).toThrow('WaitUtil clearAll failed');
    });

    it('should handle click errors in selectToolbar', () => {
      const error = new Error('Click failed');
      // Reset mock to normal behavior first
      mockJQuery.mockReturnValue(mockJQueryElement);
      mockJQueryElement.length = 1;

      // Then mock click to throw error
      mockJQueryElement.click.mockImplementation(() => {
        throw error;
      });

      expect(() => styleManager.selectToolbar(3)).toThrow('Click failed');
    });
  });
});
