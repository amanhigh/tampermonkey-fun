import { TickerRepo, ITickerRepo } from '../../src/repo/ticker';
import { IRepoCron } from '../../src/repo/cron';

// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('TickerRepo', () => {
  let tickerRepo: ITickerRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    tickerRepo = new TickerRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(tickerRepo);
    });

    it('should initialize with empty maps', () => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        expect(tickerRepo.getCount()).toBe(0);
        expect(tickerRepo.getAllKeys()).toEqual([]);
      });
    });
  });

  describe('Map operations', () => {
    beforeEach(() => {
      // Ensure clean state
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        tickerRepo.clear();
      });
    });

    it('should set and get values', () => {
      tickerRepo.set('AAPL', 'apple-computer-inc');
      expect(tickerRepo.get('AAPL')).toBe('apple-computer-inc');
      expect(tickerRepo.has('AAPL')).toBe(true);
    });

    it('should return undefined for non-existent keys', () => {
      expect(tickerRepo.get('INVALID')).toBeUndefined();
      expect(tickerRepo.has('INVALID')).toBe(false);
    });

    it('should delete entries', () => {
      tickerRepo.set('MSFT', 'microsoft-corp');
      expect(tickerRepo.delete('MSFT')).toBe(true);
      expect(tickerRepo.has('MSFT')).toBe(false);
      expect(tickerRepo.delete('NONEXISTENT')).toBe(false);
    });

    it('should get correct count', () => {
      expect(tickerRepo.getCount()).toBe(0);
      tickerRepo.set('TSLA', 'tesla-motors');
      expect(tickerRepo.getCount()).toBe(1);
      tickerRepo.set('GOOGL', 'alphabet-inc');
      expect(tickerRepo.getCount()).toBe(2);
    });

    it('should get all keys', () => {
      tickerRepo.set('NVDA', 'nvidia-corp');
      tickerRepo.set('AMD', 'advanced-micro-devices');
      const keys = tickerRepo.getAllKeys();
      expect(keys).toContain('NVDA');
      expect(keys).toContain('AMD');
      expect(keys.length).toBe(2);
    });

    it('should clear all entries', () => {
      tickerRepo.set('INTC', 'intel-corp');
      tickerRepo.set('ORCL', 'oracle-corp');
      expect(tickerRepo.getCount()).toBe(2);
      tickerRepo.clear();
      expect(tickerRepo.getCount()).toBe(0);
      expect(tickerRepo.has('INTC')).toBe(false);
    });
  });

  describe('ticker-specific operations', () => {
    beforeEach(() => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        tickerRepo.clear();
      });
    });

    it('should get investing ticker', () => {
      tickerRepo.set('AAPL', 'apple-computer-inc');
      expect(tickerRepo.getInvestingTicker('AAPL')).toBe('apple-computer-inc');
      expect(tickerRepo.getInvestingTicker('INVALID')).toBeNull();
    });

    it('should get TV ticker from reverse map', () => {
      tickerRepo.set('AAPL', 'apple-computer-inc');
      expect(tickerRepo.getTvTicker('apple-computer-inc')).toBe('AAPL');
      expect(tickerRepo.getTvTicker('invalid')).toBeNull();
    });

    it('should pin investing ticker', () => {
      tickerRepo.pinInvestingTicker('MSFT', 'microsoft-corp');
      expect(tickerRepo.get('MSFT')).toBe('microsoft-corp');
      expect(tickerRepo.getTvTicker('microsoft-corp')).toBe('MSFT');
    });
  });

  describe('reverse map maintenance', () => {
    beforeEach(() => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        tickerRepo.clear();
      });
    });

    it('should update reverse map on set', () => {
      tickerRepo.set('GOOGL', 'alphabet-inc');
      expect(tickerRepo.getTvTicker('alphabet-inc')).toBe('GOOGL');
    });

    it('should update reverse map on delete', () => {
      tickerRepo.set('TSLA', 'tesla-motors');
      tickerRepo.delete('TSLA');
      expect(tickerRepo.getTvTicker('tesla-motors')).toBeNull();
    });

    it('should clear reverse map on clear', () => {
      tickerRepo.set('NVDA', 'nvidia-corp');
      tickerRepo.clear();
      expect(tickerRepo.getTvTicker('nvidia-corp')).toBeNull();
    });
  });

  describe('load and save operations', () => {
    it('should load data from GM storage', async () => {
      const mockData = { AAPL: 'apple-computer-inc', MSFT: 'microsoft-corp' };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new TickerRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.has('AAPL')).toBe(true);
      expect(loadedData.get('AAPL')).toBe('apple-computer-inc');
      expect(newRepo.getTvTicker('apple-computer-inc')).toBe('AAPL');
    });

    it('should save data to GM storage', async () => {
      tickerRepo.set('TSLA', 'tesla-motors');
      tickerRepo.set('GOOGL', 'alphabet-inc');

      await tickerRepo.save();

      expect(mockGM.setValue).toHaveBeenCalledWith('tickerRepo', expect.any(Object));
      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData.AAPL).toBeUndefined(); // Not set
      expect(savedData.TSLA).toBe('tesla-motors');
      expect(savedData.GOOGL).toBe('alphabet-inc');
    });

    it('should handle GM API load errors', async () => {
      mockGM.getValue.mockRejectedValue(new Error('Storage error'));

      await expect(tickerRepo.load()).rejects.toThrow('Storage error');
    });

    it('should handle GM API save errors', async () => {
      mockGM.setValue.mockRejectedValue(new Error('Save failed'));

      await expect(tickerRepo.save()).rejects.toThrow('Save failed');
    });
  });

  describe('data persistence and serialization', () => {
    it('should persist data through save and load cycle', async () => {
      tickerRepo.set('NVDA', 'nvidia-corp');
      tickerRepo.set('AMD', 'advanced-micro-devices');

      await tickerRepo.save();

      const savedData = mockGM.setValue.mock.calls[0][1];
      mockGM.getValue.mockResolvedValue(savedData);

      const newRepo = new TickerRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.get('NVDA')).toBe('nvidia-corp');
      expect(loadedData.get('AMD')).toBe('advanced-micro-devices');
      expect(newRepo.getTvTicker('nvidia-corp')).toBe('NVDA');
      expect(newRepo.getTvTicker('advanced-micro-devices')).toBe('AMD');
    });

    it('should handle empty data serialization', async () => {
      tickerRepo.clear();
      await tickerRepo.save();

      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData).toEqual({});
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        tickerRepo.clear();
      });
    });

    it('should handle duplicate mappings', () => {
      tickerRepo.set('AAPL', 'apple-1');
      tickerRepo.set('AAPL', 'apple-2'); // Override
      expect(tickerRepo.getInvestingTicker('AAPL')).toBe('apple-2');
      expect(tickerRepo.getTvTicker('apple-1')).toBeNull();
      expect(tickerRepo.getTvTicker('apple-2')).toBe('AAPL');
    });

    it('should overwrite reverse map when multiple TV tickers map to same investing ticker', () => {
      tickerRepo.set('AAPL', 'apple-inc');
      tickerRepo.set('APPLE', 'apple-inc');
      // 1:1 reverse map: last set wins
      expect(tickerRepo.getTvTicker('apple-inc')).toBe('APPLE');
    });

    it('should remove reverse map entry on delete', () => {
      tickerRepo.set('AAPL', 'apple-inc');
      tickerRepo.delete('AAPL');
      expect(tickerRepo.getTvTicker('apple-inc')).toBeNull();
    });

    it('should handle case sensitivity', () => {
      tickerRepo.set('aapl', 'apple');
      expect(tickerRepo.getInvestingTicker('AAPL')).toBeNull();
      expect(tickerRepo.getInvestingTicker('aapl')).toBe('apple');
      expect(tickerRepo.getTvTicker('apple')).toBe('aapl');
    });

    it('should handle empty string keys and values', () => {
      tickerRepo.set('', 'empty-key');
      tickerRepo.set('empty-value', '');
      expect(tickerRepo.get('')).toBe('empty-key');
      expect(tickerRepo.get('empty-value')).toBe('');
      // Empty string tvTicker stored in reverse map but || null treats '' as falsy
      expect(tickerRepo.getTvTicker('empty-key')).toBeNull();
      expect(tickerRepo.getTvTicker('')).toBe('empty-value');
    });

    it('should handle special characters in tickers', () => {
      const specialKey = 'TICKER.WITH.DOTS';
      const specialValue = 'ticker/with/slashes';
      tickerRepo.set(specialKey, specialValue);
      expect(tickerRepo.get(specialKey)).toBe(specialValue);
      expect(tickerRepo.getTvTicker(specialValue)).toBe(specialKey);
    });
  });
});
