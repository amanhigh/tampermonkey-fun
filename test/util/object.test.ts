import { ObjectUtils } from '../../src/util/object';

describe('ObjectUtils', () => {
  describe('reverseMap', () => {
    test('should reverse simple key-value pairs', () => {
      const input = { a: '1', b: '2', c: '3' };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ '1': 'a', '2': 'b', '3': 'c' });
    });

    test('should handle numeric values by converting to strings', () => {
      const input = { first: 1, second: 2, third: 3 };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ '1': 'first', '2': 'second', '3': 'third' });
    });

    test('should handle boolean values by converting to strings', () => {
      const input = { isTrue: true, isFalse: false };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ true: 'isTrue', false: 'isFalse' });
    });

    test('should handle mixed value types', () => {
      const input = { str: 'value', num: 42, bool: true };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ value: 'str', '42': 'num', true: 'bool' });
    });

    test('should skip null values and warn', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const input = { valid: 'keep', nullValue: null, valid2: 'keep2' };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ keep: 'valid', keep2: 'valid2' });
      expect(consoleSpy).toHaveBeenCalledWith('Skipping null/undefined value for key: nullValue');
      consoleSpy.mockRestore();
    });

    test('should skip undefined values and warn', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const input = { valid: 'keep', undefinedValue: undefined, valid2: 'keep2' };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ keep: 'valid', keep2: 'valid2' });
      expect(consoleSpy).toHaveBeenCalledWith('Skipping null/undefined value for key: undefinedValue');
      consoleSpy.mockRestore();
    });

    test('should handle duplicate values and warn about overwriting', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const input = { first: 'duplicate', second: 'duplicate', third: 'unique' };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ duplicate: 'second', unique: 'third' });
      expect(consoleSpy).toHaveBeenCalledWith('Duplicate value found: duplicate. Previous key will be overwritten.');
      consoleSpy.mockRestore();
    });

    test('should return empty object for empty input', () => {
      const result = ObjectUtils.reverseMap({});
      expect(result).toEqual({});
    });

    test('should throw error for null input', () => {
      expect(() => ObjectUtils.reverseMap(null as any)).toThrow('Input must be a non-null object');
    });

    test('should throw error for undefined input', () => {
      expect(() => ObjectUtils.reverseMap(undefined as any)).toThrow('Input must be a non-null object');
    });

    test('should throw error for array input', () => {
      expect(() => ObjectUtils.reverseMap(['a', 'b'] as any)).toThrow('Input must be a non-null object');
    });

    test('should throw error for primitive string input', () => {
      expect(() => ObjectUtils.reverseMap('string' as any)).toThrow('Input must be a non-null object');
    });

    test('should throw error for primitive number input', () => {
      expect(() => ObjectUtils.reverseMap(42 as any)).toThrow('Input must be a non-null object');
    });

    test('should handle objects with symbol values', () => {
      const symbol = Symbol('test');
      const input = { key1: 'string', key2: symbol };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ string: 'key1', 'Symbol(test)': 'key2' });
    });

    test('should handle complex object keys and values', () => {
      const input = { 'complex-key': 'complex-value', 'key with spaces': 'value with spaces' };
      const result = ObjectUtils.reverseMap(input);

      expect(result).toEqual({ 'complex-value': 'complex-key', 'value with spaces': 'key with spaces' });
    });

    test('should preserve key type information in reversed mapping', () => {
      const input = { first: 'value1', second: 'value2' };
      const result = ObjectUtils.reverseMap(input);

      expect(typeof result['value1']).toBe('string');
      expect(typeof result['value2']).toBe('string');
      expect(result['value1']).toBe('first');
      expect(result['value2']).toBe('second');
    });
  });
});
