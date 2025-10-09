import { TradingViewManager } from '../../src/manager/tv';
import { WaitUtil } from '../../src/util/wait';
import { IRepoCron } from '../../src/repo/cron';
import { IKohanClient } from '../../src/client/kohan';
import { Constants } from '../../src/models/constant';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

// Mock GM API
const mockGM = {
  setClipboard: jest.fn(),
};
(global as any).GM = mockGM;

// Mock jQuery and DOM elements
const mockJQueryElement = {
  length: 1,
  text: jest.fn(() => '100.50'),
  click: jest.fn(),
  prop: jest.fn(),
  innerHTML: 'Test Symbol',
};

const mockJQuery = jest.fn((selector: string) => {
  switch (selector) {
    case Constants.DOM.BASIC.LTP:
      return mockJQueryElement;
    case Constants.DOM.BASIC.NAME:
      return [{ innerHTML: 'Test Symbol Name' }];
    case Constants.DOM.HEADER.SAVE:
      return mockJQueryElement;
    case `#${Constants.UI.IDS.CHECKBOXES.SWIFT}`:
      return mockJQueryElement;
    default:
      return { ...mockJQueryElement, length: 0 };
  }
});

// Setup global $
(global as any).$ = mockJQuery;

describe('TradingViewManager', () => {
  let manager: TradingViewManager;
  let mockWaitUtil: jest.Mocked<WaitUtil>;
  let mockRepoCron: jest.Mocked<IRepoCron>;
  let mockKohanClient: jest.Mocked<IKohanClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWaitUtil = {
      waitEE: jest.fn(),
      waitJEE: jest.fn(),
      waitClick: jest.fn(),
      waitJClick: jest.fn(),
      waitInput: jest.fn(),
    };

    mockRepoCron = {
      registerRepository: jest.fn(),
      saveAllRepositories: jest.fn().mockResolvedValue(undefined),
    };

    mockKohanClient = {
      recordTicker: jest.fn(),
      getClip: jest.fn(),
      enableSubmap: jest.fn().mockResolvedValue(undefined),
      disableSubmap: jest.fn().mockResolvedValue(undefined),
      getBaseUrl: jest.fn(),
    };

    manager = new TradingViewManager(mockWaitUtil, mockRepoCron, mockKohanClient);

    // Reset mock states
    mockJQueryElement.text.mockReturnValue('100.50');
    mockJQueryElement.prop.mockReturnValue(false);
  });

  describe('parsePriceFromText', () => {
    test('extracts simple price', () => {
      expect(manager.parsePriceFromText('Copy price 100.50')).toBe(100.5);
    });

    test('handles commas in price', () => {
      expect(manager.parsePriceFromText('Copy price 1,234.56')).toBe(1234.56);
    });

    test('handles leading/trailing spaces', () => {
      expect(manager.parsePriceFromText('  Copy price  123.45  ')).toBe(123.45);
    });

    test('throws error for invalid format', () => {
      expect(() => manager.parsePriceFromText('Invalid text')).toThrow('Cursor Extraction Failed');
    });

    test('throws error for zero price', () => {
      expect(() => manager.parsePriceFromText('Copy price 0.00')).toThrow('Invalid Cursor Price');
    });

    test('handles negative prices', () => {
      expect(manager.parsePriceFromText('Copy price -123.45')).toBe(-123.45);
    });
  });

  describe('startAutoSave', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should set up auto-save interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      manager.startAutoSave();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      setIntervalSpy.mockRestore();
    });
  });

  describe('getName', () => {
    test('should return innerHTML of name element', () => {
      const result = manager.getName();

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.NAME);
      expect(result).toBe('Test Symbol Name');
    });
  });

  describe('getLastTradedPrice', () => {
    test('should return parsed LTP when element exists', () => {
      mockJQueryElement.text.mockReturnValue('1,234.56');

      const result = manager.getLastTradedPrice();

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.LTP);
      expect(result).toBe(1234.56);
    });

    test('should handle LTP with spaces', () => {
      mockJQueryElement.text.mockReturnValue('  500.25  ');

      const result = manager.getLastTradedPrice();

      expect(result).toBe(500.25);
    });

    test('should throw error when LTP element not found', () => {
      const mockEmptyElement = {
        length: 0,
        text: jest.fn(),
        click: jest.fn(),
        prop: jest.fn(),
        innerHTML: '',
      };
      mockJQuery.mockReturnValue(mockEmptyElement);

      expect(() => manager.getLastTradedPrice()).toThrow('LTP element not found');
    });

    test('should throw error when LTP text cannot be parsed', () => {
      // Ensure element exists but has invalid text
      const mockLTPElement = {
        length: 1,
        text: jest.fn(() => 'Invalid Price Text'),
        click: jest.fn(),
        prop: jest.fn(),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === Constants.DOM.BASIC.LTP) {
          return mockLTPElement;
        }
        return mockJQueryElement;
      });

      expect(() => manager.getLastTradedPrice()).toThrow('LTP Parse Failed');
    });

    test('should handle negative LTP', () => {
      // Ensure element exists with negative price
      const mockLTPElement = {
        length: 1,
        text: jest.fn(() => '-50.25'),
        click: jest.fn(),
        prop: jest.fn(),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === Constants.DOM.BASIC.LTP) {
          return mockLTPElement;
        }
        return mockJQueryElement;
      });

      const result = manager.getLastTradedPrice();

      expect(result).toBe(-50.25);
    });
  });

  describe('getCursorPrice', () => {
    test('should resolve with parsed price from cursor element', async () => {
      const mockElement = { text: jest.fn(() => 'Copy price 150.75') };
      mockWaitUtil.waitJEE.mockImplementation((_selector, callback) => {
        callback(mockElement as any);
      });

      const result = await manager.getCursorPrice();

      expect(mockWaitUtil.waitJEE).toHaveBeenCalledWith(Constants.DOM.POPUPS.AUTO_ALERT, expect.any(Function));
      expect(result).toBe(150.75);
    });

    test('should reject when price parsing fails', async () => {
      const mockElement = { text: jest.fn(() => 'Invalid price text') };
      mockWaitUtil.waitJEE.mockImplementation((_selector, callback) => {
        callback(mockElement as any);
      });

      await expect(manager.getCursorPrice()).rejects.toThrow('Cursor Extraction Failed');
    });

    test('should reject when element text throws error', async () => {
      const mockElement = {
        text: jest.fn(() => {
          throw new Error('Element error');
        }),
      };
      mockWaitUtil.waitJEE.mockImplementation((_selector, callback) => {
        callback(mockElement as any);
      });

      await expect(manager.getCursorPrice()).rejects.toThrow('Element error');
    });
  });

  describe('clipboardCopy', () => {
    test('should copy text to clipboard and show notification', () => {
      const testText = 'Test clipboard text';

      manager.clipboardCopy(testText);

      expect(mockGM.setClipboard).toHaveBeenCalledWith(testText);
      // Notifier.yellow call is verified through the mock
    });

    test('should handle empty string', () => {
      manager.clipboardCopy('');

      expect(mockGM.setClipboard).toHaveBeenCalledWith('');
    });

    test('should handle special characters', () => {
      const specialText = '!@#$%^&*()_+{}|:"<>?[]\\;\'.,/`~';

      manager.clipboardCopy(specialText);

      expect(mockGM.setClipboard).toHaveBeenCalledWith(specialText);
    });
  });

  describe('toggleFlag', () => {
    test('should trigger flag toggle click', () => {
      manager.toggleFlag();

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.HEADER.SYMBOL_FLAG);
    });
  });

  describe('closeTextBox', () => {
    test('should trigger close textbox click', () => {
      manager.closeTextBox();

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledWith(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
    });
  });

  describe('isSwiftKeysEnabled', () => {
    test('should return true when checkbox is checked', () => {
      // Create a specific mock for swift checkbox
      const mockSwiftElement = {
        length: 1,
        text: jest.fn(),
        click: jest.fn(),
        prop: jest.fn(() => true),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === `#${Constants.UI.IDS.CHECKBOXES.SWIFT}`) {
          return mockSwiftElement;
        }
        return mockJQueryElement;
      });

      const result = manager.isSwiftKeysEnabled();

      expect(mockJQuery).toHaveBeenCalledWith(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`);
      expect(mockSwiftElement.prop).toHaveBeenCalledWith('checked');
      expect(result).toBe(true);
    });

    test('should return false when checkbox is unchecked', () => {
      const mockSwiftElement = {
        length: 1,
        text: jest.fn(),
        click: jest.fn(),
        prop: jest.fn(() => false),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === `#${Constants.UI.IDS.CHECKBOXES.SWIFT}`) {
          return mockSwiftElement;
        }
        return mockJQueryElement;
      });

      const result = manager.isSwiftKeysEnabled();

      expect(result).toBe(false);
    });
  });

  describe('setSwiftKeysState', () => {
    test('should enable swift keys and call kohan client', async () => {
      const mockSwiftElement = {
        length: 1,
        text: jest.fn(),
        click: jest.fn(),
        prop: jest.fn(),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === `#${Constants.UI.IDS.CHECKBOXES.SWIFT}`) {
          return mockSwiftElement;
        }
        return mockJQueryElement;
      });

      await manager.setSwiftKeysState(true);

      expect(mockSwiftElement.prop).toHaveBeenCalledWith('checked', true);
      expect(mockKohanClient.enableSubmap).toHaveBeenCalledWith('swiftkeys');
      expect(mockKohanClient.disableSubmap).not.toHaveBeenCalled();
    });

    test('should disable swift keys and call kohan client', async () => {
      const mockSwiftElement = {
        length: 1,
        text: jest.fn(),
        click: jest.fn(),
        prop: jest.fn(),
        innerHTML: '',
      };
      mockJQuery.mockImplementation((selector) => {
        if (selector === `#${Constants.UI.IDS.CHECKBOXES.SWIFT}`) {
          return mockSwiftElement;
        }
        return mockJQueryElement;
      });

      await manager.setSwiftKeysState(false);

      expect(mockSwiftElement.prop).toHaveBeenCalledWith('checked', false);
      expect(mockKohanClient.disableSubmap).toHaveBeenCalledWith('swiftkeys');
      expect(mockKohanClient.enableSubmap).not.toHaveBeenCalled();
    });

    test('should throw error when kohan client enable fails', async () => {
      const errorMessage = 'Network error';
      mockKohanClient.enableSubmap.mockRejectedValue(new Error(errorMessage));

      await expect(manager.setSwiftKeysState(true)).rejects.toThrow(`SwiftKey state change failed: ${errorMessage}`);
    });

    test('should throw error when kohan client disable fails', async () => {
      const errorMessage = 'API error';
      mockKohanClient.disableSubmap.mockRejectedValue(new Error(errorMessage));

      await expect(manager.setSwiftKeysState(false)).rejects.toThrow(`SwiftKey state change failed: ${errorMessage}`);
    });

    test('should handle non-Error objects in catch block', async () => {
      const errorObj = { message: 'String error' };
      mockKohanClient.enableSubmap.mockRejectedValue(errorObj);

      await expect(manager.setSwiftKeysState(true)).rejects.toThrow('SwiftKey state change failed: String error');
    });
  });

  describe('Integration tests', () => {
    test('should handle multiple operations sequentially', () => {
      manager.toggleFlag();
      manager.closeTextBox();
      manager.clipboardCopy('test');

      expect(mockWaitUtil.waitJClick).toHaveBeenCalledTimes(2);
      expect(mockGM.setClipboard).toHaveBeenCalledWith('test');
    });

    test('should work with real price extraction workflow', async () => {
      // Test the workflow of getting cursor price and copying it
      const mockElement = { text: jest.fn(() => 'Copy price 250.75') };
      mockWaitUtil.waitJEE.mockImplementation((_selector, callback) => {
        callback(mockElement as any);
      });

      const price = await manager.getCursorPrice();
      manager.clipboardCopy(price.toString());

      expect(price).toBe(250.75);
      expect(mockGM.setClipboard).toHaveBeenCalledWith('250.75');
    });
  });
});
