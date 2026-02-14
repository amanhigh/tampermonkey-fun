import { WaitUtil } from '../../src/util/wait';

// Setup DOM globals for Node.js environment
(global as any).Event = class Event {
  constructor(
    public type: string,
    public options: any = {}
  ) {
    this.bubbles = options.bubbles || false;
  }
  bubbles: boolean;
};

(global as any).KeyboardEvent = class KeyboardEvent extends (global as any).Event {
  constructor(type: string, options: any = {}) {
    super(type, options);
    this.key = options.key || '';
  }
  key: string;
};

// Setup global DOM and jQuery mocks
const mockElement = {
  click: jest.fn(),
  value: '',
  dispatchEvent: jest.fn(),
} as any;

const mockJQueryElement = {
  length: 1,
  click: jest.fn(),
};

const mockJQuery = jest.fn((selector: string) => {
  if (selector === '.existing-element') {
    return { ...mockJQueryElement, length: 1 };
  }
  return { ...mockJQueryElement, length: 0 };
});

// Setup global $ and document mocks
(global as any).$ = mockJQuery;
(global as any).document = {
  querySelector: jest.fn((selector: string) => {
    if (selector === '.existing-element') {
      return mockElement;
    }
    return null;
  }),
};

describe('WaitUtil', () => {
  let waitUtil: WaitUtil;
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    waitUtil = new WaitUtil();
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Reset mock states
    mockElement.click.mockClear();
    mockElement.dispatchEvent.mockClear();
    mockJQueryElement.click.mockClear();
    mockElement.value = '';
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Input validation for waitEE', () => {
    test('should log error and return early for null selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(null as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for undefined selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(undefined as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for empty string selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE('', callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should log error and return early for non-string selector', () => {
      const callback = jest.fn();
      waitUtil.waitEE(123 as any, callback);

      expect(consoleSpy).toHaveBeenCalledWith('Invalid selector provided to waitEE');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Input validation for waitInput', () => {
    test('should log error and return early for undefined input value', () => {
      waitUtil.waitInput('.input-selector', undefined as any);

      expect(consoleSpy).toHaveBeenCalledWith('Input value must be provided to waitInput');
    });
  });

  describe('waitEE element finding', () => {
    test('should execute callback immediately when element is found', () => {
      const callback = jest.fn();

      waitUtil.waitEE('.existing-element', callback);

      expect(callback).toHaveBeenCalledWith(mockElement);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should set up timeout for retry when element not found', () => {
      const callback = jest.fn();
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      waitUtil.waitEE('.non-existing-element', callback, 2, 100);

      expect(callback).not.toHaveBeenCalled();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

      jest.useRealTimers();
      setTimeoutSpy.mockRestore();
    });

    test('should log error when retry count reaches zero', () => {
      const callback = jest.fn();

      waitUtil.waitEE('.non-existing-element', callback, 0, 100);

      expect(consoleSpy).toHaveBeenCalledWith('Wait Element Failed, exiting Recursion: .non-existing-element');
      expect(callback).not.toHaveBeenCalled();
    });

    test('should use default parameters when not provided', () => {
      const callback = jest.fn();

      waitUtil.waitEE('.existing-element', callback);

      expect(callback).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('waitJEE jQuery element finding', () => {
    test('should execute callback immediately when jQuery element is found', () => {
      const callback = jest.fn();

      waitUtil.waitJEE('.existing-element', callback);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ length: 1 }));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should set up timeout for retry when jQuery element not found', () => {
      const callback = jest.fn();
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      waitUtil.waitJEE('.non-existing-element', callback, 2, 100);

      expect(callback).not.toHaveBeenCalled();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

      jest.useRealTimers();
      setTimeoutSpy.mockRestore();
    });

    test('should log warning when jQuery retry count reaches zero', () => {
      const callback = jest.fn();

      waitUtil.waitJEE('.non-existing-element', callback, 0, 100);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Jquery Wait Element Failed, exiting Recursion: .non-existing-element'
      );
      expect(callback).not.toHaveBeenCalled();
    });

    test('should use default parameters when not provided', () => {
      const callback = jest.fn();

      waitUtil.waitJEE('.existing-element', callback);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ length: 1 }));
    });
  });

  describe('waitClick', () => {
    test('should wait for element and trigger click', () => {
      const callback = jest.fn();

      waitUtil.waitClick('.existing-element', callback);

      expect(mockElement.click).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('should work without callback', () => {
      waitUtil.waitClick('.existing-element');

      expect(mockElement.click).toHaveBeenCalled();
    });

    test('should use default empty callback when none provided', () => {
      expect(() => {
        waitUtil.waitClick('.existing-element');
      }).not.toThrow();

      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('waitJClick', () => {
    test('should wait for jQuery element and trigger click', () => {
      const callback = jest.fn();

      waitUtil.waitJClick('.existing-element', callback);

      expect(mockJQueryElement.click).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('should work without callback', () => {
      waitUtil.waitJClick('.existing-element');

      expect(mockJQueryElement.click).toHaveBeenCalled();
    });

    test('should use custom timeout and count parameters', () => {
      const callback = jest.fn();
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      waitUtil.waitJClick('.non-existing-element', callback);

      // waitJClick uses count=3, timeout=20
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 20);

      jest.useRealTimers();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('waitInput', () => {
    test('should set input value and dispatch events', () => {
      const inputValue = 'test input';

      waitUtil.waitInput('.existing-element', inputValue);

      expect(mockElement.value).toBe(inputValue);
      expect(mockElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          bubbles: true,
        })
      );
      expect(mockElement.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keydown',
          bubbles: true,
          key: 'Enter',
        })
      );
    });

    test('should handle empty string input', () => {
      const inputValue = '';

      waitUtil.waitInput('.existing-element', inputValue);

      expect(mockElement.value).toBe('');
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
    });

    test('should handle numeric string input', () => {
      const inputValue = '12345';

      waitUtil.waitInput('.existing-element', inputValue);

      expect(mockElement.value).toBe('12345');
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
    });

    test('should handle special characters in input', () => {
      const inputValue = '!@#$%^&*()';

      waitUtil.waitInput('.existing-element', inputValue);

      expect(mockElement.value).toBe('!@#$%^&*()');
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
    });

    test('should use custom count and timeout parameters', () => {
      const inputValue = 'test';
      jest.useFakeTimers();
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      waitUtil.waitInput('.non-existing-element', inputValue);

      // waitInput uses count=6, timeout=5
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5);

      jest.useRealTimers();
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Integration tests', () => {
    test('should handle multiple wait operations sequentially', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      waitUtil.waitEE('.existing-element', callback1);
      waitUtil.waitJEE('.existing-element', callback2);

      expect(callback1).toHaveBeenCalledWith(mockElement);
      expect(callback2).toHaveBeenCalledWith(expect.objectContaining({ length: 1 }));
    });

    test('should handle click and input operations on same element', () => {
      const clickCallback = jest.fn();

      waitUtil.waitClick('.existing-element', clickCallback);
      waitUtil.waitInput('.existing-element', 'test input');

      expect(mockElement.click).toHaveBeenCalled();
      expect(clickCallback).toHaveBeenCalled();
      expect(mockElement.value).toBe('test input');
      expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
    });
  });
});
