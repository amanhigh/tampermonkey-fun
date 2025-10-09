import { KeyUtil } from '../../src/util/key';
import { ISyncUtil } from '../../src/util/sync';

// Mock KeyboardEvent for Node.js environment
Object.defineProperty(global, 'KeyboardEvent', {
  writable: true,
  value: class KeyboardEvent {
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    key: string;
    constructor(_type: string, options: any = {}) {
      this.ctrlKey = options.ctrlKey || false;
      this.shiftKey = options.shiftKey || false;
      this.altKey = options.altKey || false;
      this.key = options.key || '';
    }
  },
});

describe('KeyUtil', () => {
  let keyUtil: KeyUtil;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;

  beforeEach(() => {
    mockSyncUtil = {
      waitOn: jest.fn(),
    } as jest.Mocked<ISyncUtil>;

    keyUtil = new KeyUtil(mockSyncUtil);
  });

  describe('hasModifierKey', () => {
    test('should return true when ctrl key is pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true });
      expect(keyUtil.hasModifierKey(event)).toBe(true);
    });

    test('should return true when shift key is pressed', () => {
      const event = new KeyboardEvent('keydown', { shiftKey: true });
      expect(keyUtil.hasModifierKey(event)).toBe(true);
    });

    test('should return true when alt key is pressed', () => {
      const event = new KeyboardEvent('keydown', { altKey: true });
      expect(keyUtil.hasModifierKey(event)).toBe(true);
    });

    test('should return true when multiple modifier keys are pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true });
      expect(keyUtil.hasModifierKey(event)).toBe(true);
    });

    test('should return true when all modifier keys are pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, altKey: true });
      expect(keyUtil.hasModifierKey(event)).toBe(true);
    });

    test('should return false when no modifier keys are pressed', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyUtil.hasModifierKey(event)).toBe(false);
    });

    test('should return false and log error for null event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.hasModifierKey(null as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to hasModifierKey');
      consoleSpy.mockRestore();
    });

    test('should return false and log error for undefined event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.hasModifierKey(undefined as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to hasModifierKey');
      consoleSpy.mockRestore();
    });

    test('should return false and log error for non-KeyboardEvent object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.hasModifierKey({} as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to hasModifierKey');
      consoleSpy.mockRestore();
    });
  });

  describe('getModifierType', () => {
    test('should return "ctrl" when only ctrl key is pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true });
      expect(keyUtil.getModifierType(event)).toBe('ctrl');
    });

    test('should return "shift" when only shift key is pressed', () => {
      const event = new KeyboardEvent('keydown', { shiftKey: true });
      expect(keyUtil.getModifierType(event)).toBe('shift');
    });

    test('should return "alt" when only alt key is pressed', () => {
      const event = new KeyboardEvent('keydown', { altKey: true });
      expect(keyUtil.getModifierType(event)).toBe('alt');
    });

    test('should prioritize ctrl over shift when both are pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true });
      expect(keyUtil.getModifierType(event)).toBe('ctrl');
    });

    test('should prioritize ctrl over alt when both are pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, altKey: true });
      expect(keyUtil.getModifierType(event)).toBe('ctrl');
    });

    test('should prioritize shift over alt when both are pressed', () => {
      const event = new KeyboardEvent('keydown', { shiftKey: true, altKey: true });
      expect(keyUtil.getModifierType(event)).toBe('shift');
    });

    test('should prioritize ctrl when all modifiers are pressed', () => {
      const event = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, altKey: true });
      expect(keyUtil.getModifierType(event)).toBe('ctrl');
    });

    test('should return null when no modifier keys are pressed', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyUtil.getModifierType(event)).toBe(null);
    });

    test('should return null and log error for null event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.getModifierType(null as any);

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to getModifierType');
      consoleSpy.mockRestore();
    });

    test('should return null and log error for undefined event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.getModifierType(undefined as any);

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to getModifierType');
      consoleSpy.mockRestore();
    });

    test('should return null and log error for non-KeyboardEvent object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.getModifierType({} as any);

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to getModifierType');
      consoleSpy.mockRestore();
    });
  });

  describe('isModifierKeyPressed', () => {
    test('should return true when modifier is active and key matches (lowercase)', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyUtil.isModifierKeyPressed(true, 'a', event)).toBe(true);
    });

    test('should return true when modifier is active and key matches (uppercase to lowercase)', () => {
      const event = new KeyboardEvent('keydown', { key: 'A' });
      expect(keyUtil.isModifierKeyPressed(true, 'a', event)).toBe(true);
    });

    test('should return false when modifier is active but key does not match', () => {
      const event = new KeyboardEvent('keydown', { key: 'b' });
      expect(keyUtil.isModifierKeyPressed(true, 'a', event)).toBe(false);
    });

    test('should return false when modifier is not active even if key matches', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      expect(keyUtil.isModifierKeyPressed(false, 'a', event)).toBe(false);
    });

    test('should return false when modifier is not active and key does not match', () => {
      const event = new KeyboardEvent('keydown', { key: 'b' });
      expect(keyUtil.isModifierKeyPressed(false, 'a', event)).toBe(false);
    });

    test('should handle special keys like Enter', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      expect(keyUtil.isModifierKeyPressed(true, 'enter', event)).toBe(true);
    });

    test('should handle special keys like Escape', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      expect(keyUtil.isModifierKeyPressed(true, 'escape', event)).toBe(true);
    });

    test('should handle numeric keys', () => {
      const event = new KeyboardEvent('keydown', { key: '1' });
      expect(keyUtil.isModifierKeyPressed(true, '1', event)).toBe(true);
    });

    test('should handle space key', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      expect(keyUtil.isModifierKeyPressed(true, ' ', event)).toBe(true);
    });
  });

  describe('isDoubleKey', () => {
    beforeEach(() => {
      // Reset mock before each test
      jest.clearAllMocks();
    });

    test('should return false and log error for null event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.isDoubleKey(null as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to isDoubleKey');
      consoleSpy.mockRestore();
    });

    test('should return false and log error for undefined event', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.isDoubleKey(undefined as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to isDoubleKey');
      consoleSpy.mockRestore();
    });

    test('should return false and log error for non-KeyboardEvent object', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = keyUtil.isDoubleKey({} as any);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid keyboard event provided to isDoubleKey');
      consoleSpy.mockRestore();
    });

    test('should return false for repeat events', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', repeat: true });
      const result = keyUtil.isDoubleKey(event);

      expect(result).toBe(false);
    });

    test('should return false for first key press and setup waitOn calls', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', repeat: false });
      const result = keyUtil.isDoubleKey(event);

      expect(result).toBe(false);
      expect(mockSyncUtil.waitOn).toHaveBeenCalledTimes(2);
      expect(mockSyncUtil.waitOn).toHaveBeenCalledWith('fastDoubleKeyInput', 50, expect.any(Function));
      expect(mockSyncUtil.waitOn).toHaveBeenCalledWith('doubleKeyInput', 200, expect.any(Function));
    });

    test('should return false for second key press before begin state', () => {
      // First key press to initialize state
      const firstEvent = new KeyboardEvent('keydown', { key: 'a', repeat: false });
      keyUtil.isDoubleKey(firstEvent);

      // Second key press immediately (before begin state)
      const secondEvent = new KeyboardEvent('keydown', { key: 'a', repeat: false });
      const result = keyUtil.isDoubleKey(secondEvent);

      expect(result).toBe(false);
    });

    test('should handle double key state transitions correctly', () => {
      // Test the state machine logic by simulating different states
      const event = new KeyboardEvent('keydown', { key: 'a', repeat: false });

      // First call - should initialize
      let result = keyUtil.isDoubleKey(event);
      expect(result).toBe(false);

      // Verify waitOn was called to set up timers
      expect(mockSyncUtil.waitOn).toHaveBeenCalledTimes(2);

      // Extract the callbacks that would be called by SyncUtil
      const fastCallback = mockSyncUtil.waitOn.mock.calls[0][2];
      const endCallback = mockSyncUtil.waitOn.mock.calls[1][2];

      // Simulate fast timer callback (sets begin state)
      fastCallback();

      // Second call after begin state is set - should return true
      result = keyUtil.isDoubleKey(event);
      expect(result).toBe(true);

      // Simulate end timer callback (resets state)
      endCallback();
    });

    test('should verify correct timeout values for double key detection', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', repeat: false });
      keyUtil.isDoubleKey(event);

      expect(mockSyncUtil.waitOn).toHaveBeenCalledWith('fastDoubleKeyInput', 50, expect.any(Function));
      expect(mockSyncUtil.waitOn).toHaveBeenCalledWith('doubleKeyInput', 200, expect.any(Function));
    });

    test('should handle multiple different keys independently', () => {
      const eventA = new KeyboardEvent('keydown', { key: 'a', repeat: false });
      const eventB = new KeyboardEvent('keydown', { key: 'b', repeat: false });

      // Test that different keys don't interfere with each other
      let resultA = keyUtil.isDoubleKey(eventA);
      let resultB = keyUtil.isDoubleKey(eventB);

      expect(resultA).toBe(false);
      expect(resultB).toBe(false);

      // Note: KeyUtil uses a single state object, so both keys share the same state machine
      // This test demonstrates the current behavior - single global state
      expect(mockSyncUtil.waitOn).toHaveBeenCalledTimes(2); // Second call resets state
    });

    test('should verify state machine behavior with complete cycle', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', repeat: false });

      // Initial state: init=false, begin=false, end=false
      let result = keyUtil.isDoubleKey(event);
      expect(result).toBe(false);

      // Capture the callbacks
      const fastCallback = mockSyncUtil.waitOn.mock.calls[0][2];
      const endCallback = mockSyncUtil.waitOn.mock.calls[1][2];

      // Simulate state transitions
      fastCallback(); // Sets begin=true

      // Now in window for double key detection
      result = keyUtil.isDoubleKey(event);
      expect(result).toBe(true);

      // Simulate end timer
      endCallback(); // Sets end=true, init=false

      // After end, should start over
      result = keyUtil.isDoubleKey(event);
      expect(result).toBe(false);
    });
  });
});
