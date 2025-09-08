import { FnoManager, IFnoManager } from '../../src/manager/fno';
import { IFnoRepo } from '../../src/repo/fno';

describe('FnoManager', () => {
  let fnoManager: IFnoManager;
  let mockFnoRepo: jest.Mocked<IFnoRepo>;

  beforeEach(() => {
    mockFnoRepo = {
      add: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<IFnoRepo>;

    fnoManager = new FnoManager(mockFnoRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with fnoRepo dependency', () => {
      expect(fnoManager).toBeDefined();
      expect(fnoManager).toBeInstanceOf(FnoManager);
    });
  });

  describe('add', () => {
    it('should add single ticker to repository', () => {
      const tickers = new Set(['NIFTY']);

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(1);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY');
    });

    it('should add multiple tickers to repository', () => {
      const tickers = new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']);

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(3);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('BANKNIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('RELIANCE');
    });

    it('should handle empty set gracefully', () => {
      const tickers = new Set<string>();

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).not.toHaveBeenCalled();
    });

    it('should handle set with duplicate values', () => {
      const tickers = new Set(['NIFTY', 'NIFTY', 'BANKNIFTY']);

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(2);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('BANKNIFTY');
    });

    it('should handle tickers with special characters', () => {
      const tickers = new Set(['NIFTY-50', 'BANK_NIFTY', 'RELIANCE@NSE']);

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(3);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY-50');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('BANK_NIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('RELIANCE@NSE');
    });

    it('should handle case sensitive tickers', () => {
      const tickers = new Set(['nifty', 'NIFTY', 'Nifty']);

      fnoManager.add(tickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(3);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('nifty');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('Nifty');
    });
  });

  describe('remove', () => {
    it('should remove single ticker from repository', () => {
      const tickers = new Set(['NIFTY']);

      fnoManager.remove(tickers);

      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(1);
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('NIFTY');
    });

    it('should remove multiple tickers from repository', () => {
      const tickers = new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']);

      fnoManager.remove(tickers);

      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(3);
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('BANKNIFTY');
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('RELIANCE');
    });

    it('should handle empty set gracefully', () => {
      const tickers = new Set<string>();

      fnoManager.remove(tickers);

      expect(mockFnoRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle removal of non-existent tickers', () => {
      const tickers = new Set(['NONEXISTENT']);

      fnoManager.remove(tickers);

      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(1);
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('NONEXISTENT');
    });

    it('should handle set with duplicate values', () => {
      const tickers = new Set(['NIFTY', 'NIFTY', 'BANKNIFTY']);

      fnoManager.remove(tickers);

      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(2);
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('BANKNIFTY');
    });
  });

  describe('clear', () => {
    it('should clear all tickers from repository', () => {
      fnoManager.clear();

      expect(mockFnoRepo.clear).toHaveBeenCalledTimes(1);
    });

    it('should clear repository even when empty', () => {
      mockFnoRepo.getCount.mockReturnValue(0);

      fnoManager.clear();

      expect(mockFnoRepo.clear).toHaveBeenCalledTimes(1);
    });

    it('should clear repository when populated', () => {
      mockFnoRepo.getCount.mockReturnValue(5);

      fnoManager.clear();

      expect(mockFnoRepo.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCount', () => {
    it('should return count from repository', () => {
      const expectedCount = 10;
      mockFnoRepo.getCount.mockReturnValue(expectedCount);

      const count = fnoManager.getCount();

      expect(count).toBe(expectedCount);
      expect(mockFnoRepo.getCount).toHaveBeenCalledTimes(1);
    });

    it('should return zero when repository is empty', () => {
      mockFnoRepo.getCount.mockReturnValue(0);

      const count = fnoManager.getCount();

      expect(count).toBe(0);
      expect(mockFnoRepo.getCount).toHaveBeenCalledTimes(1);
    });

    it('should return large count correctly', () => {
      const expectedCount = 1000;
      mockFnoRepo.getCount.mockReturnValue(expectedCount);

      const count = fnoManager.getCount();

      expect(count).toBe(expectedCount);
      expect(mockFnoRepo.getCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle add and remove operations sequence', () => {
      const addTickers = new Set(['NIFTY', 'BANKNIFTY']);
      const removeTickers = new Set(['NIFTY']);

      fnoManager.add(addTickers);
      fnoManager.remove(removeTickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(2);
      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(1);
      expect(mockFnoRepo.add).toHaveBeenCalledWith('NIFTY');
      expect(mockFnoRepo.add).toHaveBeenCalledWith('BANKNIFTY');
      expect(mockFnoRepo.delete).toHaveBeenCalledWith('NIFTY');
    });

    it('should handle add, getCount, clear, getCount sequence', () => {
      const tickers = new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']);
      mockFnoRepo.getCount.mockReturnValueOnce(3).mockReturnValueOnce(0);

      fnoManager.add(tickers);
      const countBefore = fnoManager.getCount();
      fnoManager.clear();
      const countAfter = fnoManager.getCount();

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(3);
      expect(mockFnoRepo.getCount).toHaveBeenCalledTimes(2);
      expect(mockFnoRepo.clear).toHaveBeenCalledTimes(1);
      expect(countBefore).toBe(3);
      expect(countAfter).toBe(0);
    });

    it('should handle bulk operations efficiently', () => {
      const largeTickers = new Set<string>();
      for (let i = 1; i <= 100; i++) {
        largeTickers.add(`TICKER${i}`);
      }

      fnoManager.add(largeTickers);

      expect(mockFnoRepo.add).toHaveBeenCalledTimes(100);
      largeTickers.forEach((ticker) => {
        expect(mockFnoRepo.add).toHaveBeenCalledWith(ticker);
      });
    });

    it('should maintain operation order for mixed add/remove calls', () => {
      const firstSet = new Set(['A', 'B']);
      const secondSet = new Set(['B', 'C']);
      const removeSet = new Set(['A', 'C']);

      fnoManager.add(firstSet);
      fnoManager.add(secondSet);
      fnoManager.remove(removeSet);

      const addCalls = mockFnoRepo.add.mock.calls.map((call) => call[0]);
      const removeCalls = mockFnoRepo.delete.mock.calls.map((call) => call[0]);

      expect(addCalls).toContain('A');
      expect(addCalls).toContain('B');
      expect(addCalls).toContain('C');
      expect(removeCalls).toContain('A');
      expect(removeCalls).toContain('C');
      expect(mockFnoRepo.add).toHaveBeenCalledTimes(4);
      expect(mockFnoRepo.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should propagate repository add errors', () => {
      const error = new Error('Repository add failed');
      mockFnoRepo.add.mockImplementation(() => {
        throw error;
      });
      const tickers = new Set(['NIFTY']);

      expect(() => fnoManager.add(tickers)).toThrow(error);
    });

    it('should propagate repository delete errors', () => {
      const error = new Error('Repository delete failed');
      mockFnoRepo.delete.mockImplementation(() => {
        throw error;
      });
      const tickers = new Set(['NIFTY']);

      expect(() => fnoManager.remove(tickers)).toThrow(error);
    });

    it('should propagate repository clear errors', () => {
      const error = new Error('Repository clear failed');
      mockFnoRepo.clear.mockImplementation(() => {
        throw error;
      });

      expect(() => fnoManager.clear()).toThrow(error);
    });

    it('should propagate repository getCount errors', () => {
      const error = new Error('Repository getCount failed');
      mockFnoRepo.getCount.mockImplementation(() => {
        throw error;
      });

      expect(() => fnoManager.getCount()).toThrow(error);
    });
  });
});
