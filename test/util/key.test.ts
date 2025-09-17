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
});
