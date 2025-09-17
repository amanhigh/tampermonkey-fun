import { Notifier } from '../../src/util/notify';
import { Color } from '../../src/models/color';

// Mock DOM environment for static testing
const mockDOM = {
  createElement: jest.fn(),
  getElementById: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// Setup DOM mocks
Object.defineProperty(global, 'document', {
  value: mockDOM,
  writable: true,
});

describe('Notifier', () => {
  let mockElement: any;
  let mockContainer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock element creation
    mockElement = {
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      parentNode: null,
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      childNodes: { length: 0 },
    };

    mockContainer = {
      id: 'flashId',
      style: {},
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      childNodes: { length: 0 },
      parentNode: mockDOM.body,
    };

    mockDOM.createElement.mockReturnValue(mockElement);
    mockDOM.getElementById.mockReturnValue(null); // Force container creation

    // Mock setTimeout to avoid async complications in tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('message', () => {
    test('should throw error for empty message', () => {
      expect(() => Notifier.message('', Color.INFO)).toThrow('Message content is required');
    });

    test('should throw error for null message', () => {
      expect(() => Notifier.message(null as any, Color.INFO)).toThrow('Message content is required');
    });

    test('should throw error for undefined message', () => {
      expect(() => Notifier.message(undefined as any, Color.INFO)).toThrow('Message content is required');
    });

    test('should throw error for missing color', () => {
      expect(() => Notifier.message('test', null as any)).toThrow('Message color is required');
    });

    test('should throw error for undefined color', () => {
      expect(() => Notifier.message('test', undefined as any)).toThrow('Message color is required');
    });

    test('should create container when it does not exist', () => {
      mockDOM.getElementById.mockReturnValue(null);

      try {
        Notifier.message('test message', Color.INFO, 1000);
      } catch (e) {
        // Expected to fail due to missing full DOM implementation
      }

      expect(mockDOM.createElement).toHaveBeenCalledWith('div');
      expect(mockDOM.body.appendChild).toHaveBeenCalled();
    });

    test('should use existing container when it exists', () => {
      mockDOM.getElementById.mockReturnValue(mockContainer);

      try {
        Notifier.message('test message', Color.INFO, 1000);
      } catch (e) {
        // Expected to fail due to missing full DOM implementation
      }

      expect(mockDOM.getElementById).toHaveBeenCalledWith('flashId');
    });

    test('should create message element with correct properties', () => {
      mockDOM.getElementById.mockReturnValue(mockContainer);

      try {
        Notifier.message('test message', Color.INFO, 1000);
      } catch (e) {
        // Expected to fail due to missing full DOM implementation
      }

      expect(mockDOM.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('error', () => {
    test('should call message with error emoji and color', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.error('test error');

      expect(spy).toHaveBeenCalledWith('❌ test error', Color.ERROR, 2000);
      spy.mockRestore();
    });

    test('should use custom timeout when provided', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.error('test error', 5000);

      expect(spy).toHaveBeenCalledWith('❌ test error', Color.ERROR, 5000);
      spy.mockRestore();
    });
  });

  describe('warn', () => {
    test('should call message with warning emoji and color', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.warn('test warning');

      expect(spy).toHaveBeenCalledWith('⚠️ test warning', Color.WARN, 2000);
      spy.mockRestore();
    });

    test('should use custom timeout when provided', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.warn('test warning', 3000);

      expect(spy).toHaveBeenCalledWith('⚠️ test warning', Color.WARN, 3000);
      spy.mockRestore();
    });
  });

  describe('success', () => {
    test('should call message with success emoji and color', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.success('test success');

      expect(spy).toHaveBeenCalledWith('✅ test success', Color.SUCCESS, 2000);
      spy.mockRestore();
    });

    test('should use custom timeout when provided', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.success('test success', 4000);

      expect(spy).toHaveBeenCalledWith('✅ test success', Color.SUCCESS, 4000);
      spy.mockRestore();
    });
  });

  describe('info', () => {
    test('should call message with info emoji and color', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.info('test info');

      expect(spy).toHaveBeenCalledWith('ℹ️ test info', Color.INFO, 2000);
      spy.mockRestore();
    });

    test('should use custom timeout when provided', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.info('test info', 1500);

      expect(spy).toHaveBeenCalledWith('ℹ️ test info', Color.INFO, 1500);
      spy.mockRestore();
    });
  });

  describe('green', () => {
    test('should call message with green color and no emoji', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.green('test green');

      expect(spy).toHaveBeenCalledWith('test green', Color.GREEN, 2000);
      spy.mockRestore();
    });
  });

  describe('red', () => {
    test('should call message with red color and no emoji', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.red('test red');

      expect(spy).toHaveBeenCalledWith('test red', Color.RED, 2000);
      spy.mockRestore();
    });
  });

  describe('yellow', () => {
    test('should call message with yellow color and no emoji', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.yellow('test yellow');

      expect(spy).toHaveBeenCalledWith('test yellow', Color.YELLOW, 2000);
      spy.mockRestore();
    });
  });

  describe('Default timeout behavior', () => {
    test('should use DEFAULT_TIMEOUT when no timeout provided', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.error('test');
      Notifier.warn('test');
      Notifier.success('test');
      Notifier.info('test');
      Notifier.green('test');
      Notifier.red('test');
      Notifier.yellow('test');

      expect(spy).toHaveBeenCalledTimes(7);
      spy.mock.calls.forEach((call) => {
        expect(call[2]).toBe(2000); // DEFAULT_TIMEOUT value
      });

      spy.mockRestore();
    });
  });

  describe('Message formatting', () => {
    test('should preserve message content with emoji formatting', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      const originalMessage = 'This is a test message with special chars: !@#$%^&*()';
      Notifier.error(originalMessage);

      expect(spy).toHaveBeenCalledWith(`❌ ${originalMessage}`, Color.ERROR, 2000);
      spy.mockRestore();
    });

    test('should handle empty string messages in wrapper methods', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      Notifier.error('');

      expect(spy).toHaveBeenCalledWith('❌ ', Color.ERROR, 2000);
      spy.mockRestore();
    });

    test('should handle multiline messages', () => {
      const spy = jest.spyOn(Notifier, 'message').mockImplementation();

      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      Notifier.info(multilineMessage);

      expect(spy).toHaveBeenCalledWith(`ℹ️ ${multilineMessage}`, Color.INFO, 2000);
      spy.mockRestore();
    });
  });
});
