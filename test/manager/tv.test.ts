import { TradingViewManager } from '../../src/manager/tv';
import { WaitUtil } from '../../src/util/wait';
import { IRepoCron } from '../../src/repo/cron';

describe('TradingViewManager', () => {
  let manager: TradingViewManager;
  let mockRepoCron: jest.Mocked<IRepoCron>;

  beforeEach(() => {
    const waitUtil = new WaitUtil();
    mockRepoCron = {
      registerRepository: jest.fn(),
      saveAllRepositories: jest.fn(),
    };
    manager = new TradingViewManager(waitUtil, mockRepoCron);
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
});
