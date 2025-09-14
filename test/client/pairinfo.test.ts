import { PairInfo } from '../../src/models/alert';

describe('PairInfo', () => {
  describe('constructor validation', () => {
    it('should create instance with valid string pairId', () => {
      const pairInfo = new PairInfo('Apple Inc', '123456', 'NASDAQ', 'AAPL');

      expect(pairInfo.name).toBe('Apple Inc');
      expect(pairInfo.pairId).toBe('123456');
      expect(pairInfo.exchange).toBe('NASDAQ');
      expect(pairInfo.symbol).toBe('AAPL');
    });

    it('should create instance with numeric string pairId', () => {
      const pairInfo = new PairInfo('Test Stock', '999', 'NYSE', 'TEST');

      expect(pairInfo.pairId).toBe('999');
      expect(typeof pairInfo.pairId).toBe('string');
    });

    it('should create instance with empty string values', () => {
      const pairInfo = new PairInfo('', '', '', '');

      expect(pairInfo.name).toBe('');
      expect(pairInfo.pairId).toBe('');
      expect(pairInfo.exchange).toBe('');
      expect(pairInfo.symbol).toBe('');
    });

    it('should create instance with special characters in name', () => {
      const specialName = 'AT&T Inc. (NYSE:T)';
      const pairInfo = new PairInfo(specialName, '12345', 'NYSE', 'T');

      expect(pairInfo.name).toBe(specialName);
    });

    it('should create instance with long string values', () => {
      const longName = 'Very Long Company Name That Exceeds Normal Expectations';
      const longPairId = '123456789012345678901234567890';
      const pairInfo = new PairInfo(longName, longPairId, 'NASDAQ', 'LONG');

      expect(pairInfo.name).toBe(longName);
      expect(pairInfo.pairId).toBe(longPairId);
    });

    it('should create instance with whitespace in values', () => {
      const pairInfo = new PairInfo(' Company Name ', ' 123 ', ' NYSE ', ' SYMB ');

      expect(pairInfo.name).toBe(' Company Name ');
      expect(pairInfo.pairId).toBe(' 123 ');
      expect(pairInfo.exchange).toBe(' NYSE ');
      expect(pairInfo.symbol).toBe(' SYMB ');
    });
  });

  describe('type validation', () => {
    it('should throw error for number pairId', () => {
      expect(() => {
        new PairInfo('Test', 123 as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - 123 to be a string, got number');
    });

    it('should throw error for boolean pairId', () => {
      expect(() => {
        new PairInfo('Test', true as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - true to be a string, got boolean');
    });

    it('should throw error for object pairId', () => {
      const objPairId = { id: 123 };
      expect(() => {
        new PairInfo('Test', objPairId as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - [object Object] to be a string, got object');
    });

    it('should throw error for array pairId', () => {
      const arrPairId = [1, 2, 3];
      expect(() => {
        new PairInfo('Test', arrPairId as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - 1,2,3 to be a string, got object');
    });

    it('should throw error for function pairId', () => {
      const funcPairId = () => '123';
      expect(() => {
        new PairInfo('Test', funcPairId as any, 'NYSE', 'TEST');
      }).toThrow(/Expected Test, pairID - .+ to be a string, got function/);
    });

    it('should throw error for symbol pairId', () => {
      const symPairId = Symbol('test');
      expect(() => {
        new PairInfo('Test', symPairId as any, 'NYSE', 'TEST');
      }).toThrow('Cannot convert a Symbol value to a string');
    });

    it('should throw error for bigint pairId', () => {
      const bigIntPairId = BigInt(123);
      expect(() => {
        new PairInfo('Test', bigIntPairId as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - 123 to be a string, got bigint');
    });
  });

  describe('error message formatting', () => {
    it('should include company name in error message', () => {
      expect(() => {
        new PairInfo('Apple Inc', 123 as any, 'NYSE', 'AAPL');
      }).toThrow('Expected Apple Inc, pairID - 123 to be a string, got number');
    });

    it('should handle empty name in error message', () => {
      expect(() => {
        new PairInfo('', 123 as any, 'NYSE', 'TEST');
      }).toThrow('Expected , pairID - 123 to be a string, got number');
    });

    it('should handle special characters in name in error message', () => {
      expect(() => {
        new PairInfo('AT&T Inc.', 123 as any, 'NYSE', 'T');
      }).toThrow('Expected AT&T Inc., pairID - 123 to be a string, got number');
    });
  });

  describe('edge cases', () => {
    it('should throw error for null pairId', () => {
      expect(() => {
        new PairInfo('Test', null as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - null to be a string, got object');
    });

    it('should throw error for undefined pairId', () => {
      expect(() => {
        new PairInfo('Test', undefined as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - undefined to be a string, got undefined');
    });

    it('should handle null values for other parameters but accept them', () => {
      const pairInfo = new PairInfo(null as any, '123', null as any, null as any);

      expect(pairInfo.name).toBeNull();
      expect(pairInfo.pairId).toBe('123');
      expect(pairInfo.exchange).toBeNull();
      expect(pairInfo.symbol).toBeNull();
    });

    it('should handle undefined values for other parameters but accept them', () => {
      const pairInfo = new PairInfo(undefined as any, '123', undefined as any, undefined as any);

      expect(pairInfo.name).toBeUndefined();
      expect(pairInfo.pairId).toBe('123');
      expect(pairInfo.exchange).toBeUndefined();
      expect(pairInfo.symbol).toBeUndefined();
    });

    it('should handle NaN as pairId (typeof NaN is number)', () => {
      expect(() => {
        new PairInfo('Test', NaN as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - NaN to be a string, got number');
    });

    it('should handle Infinity as pairId', () => {
      expect(() => {
        new PairInfo('Test', Infinity as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - Infinity to be a string, got number');
    });

    it('should handle -Infinity as pairId', () => {
      expect(() => {
        new PairInfo('Test', -Infinity as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - -Infinity to be a string, got number');
    });

    it('should handle zero as pairId', () => {
      expect(() => {
        new PairInfo('Test', 0 as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - 0 to be a string, got number');
    });

    it('should handle negative number as pairId', () => {
      expect(() => {
        new PairInfo('Test', -123 as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - -123 to be a string, got number');
    });

    it('should handle float number as pairId', () => {
      expect(() => {
        new PairInfo('Test', 123.456 as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - 123.456 to be a string, got number');
    });

    it('should handle empty object as pairId', () => {
      expect(() => {
        new PairInfo('Test', {} as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - [object Object] to be a string, got object');
    });

    it('should handle empty array as pairId', () => {
      expect(() => {
        new PairInfo('Test', [] as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID -  to be a string, got object');
    });

    it('should handle Date object as pairId', () => {
      const date = new Date('2024-01-01');
      expect(() => {
        new PairInfo('Test', date as any, 'NYSE', 'TEST');
      }).toThrow(`Expected Test, pairID - ${date.toString()} to be a string, got object`);
    });

    it('should handle regex as pairId', () => {
      const regex = /test/;
      expect(() => {
        new PairInfo('Test', regex as any, 'NYSE', 'TEST');
      }).toThrow('Expected Test, pairID - /test/ to be a string, got object');
    });

    it('should handle string coercion correctly for numbers', () => {
      // Test that actual strings that look like numbers work
      const pairInfo = new PairInfo('Test', '123.456', 'NYSE', 'TEST');
      expect(pairInfo.pairId).toBe('123.456');
      expect(typeof pairInfo.pairId).toBe('string');
    });

    it('should handle string coercion correctly for booleans', () => {
      // Test that actual string "true"/"false" work
      const pairInfo1 = new PairInfo('Test1', 'true', 'NYSE', 'TEST');
      const pairInfo2 = new PairInfo('Test2', 'false', 'NYSE', 'TEST');

      expect(pairInfo1.pairId).toBe('true');
      expect(pairInfo2.pairId).toBe('false');
    });

    it('should preserve exact string values including leading/trailing zeros', () => {
      const pairInfo = new PairInfo('Test', '000123000', 'NYSE', 'TEST');
      expect(pairInfo.pairId).toBe('000123000');
    });
  });
});
