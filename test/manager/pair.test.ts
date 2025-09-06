import { PairManager, IPairManager } from '../../src/manager/pair';
import { IPairRepo } from '../../src/repo/pair';
import { PairInfo } from '../../src/models/alert';

describe('PairManager', () => {
  let pairManager: IPairManager;
  let mockPairRepo: jest.Mocked<IPairRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PairRepo with all required methods
    mockPairRepo = {
      getPairInfo: jest.fn(),
      getAllInvestingTickers: jest.fn(),
      pinPair: jest.fn(),
      getAllKeys: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IPairRepo>;

    pairManager = new PairManager(mockPairRepo);
  });

  describe('getAllInvestingTickers', () => {
    it('should return all investing tickers from repository', () => {
      const mockTickers = ['HDFC', 'RELIANCE', 'TCS'];
      mockPairRepo.getAllInvestingTickers.mockReturnValue(mockTickers);

      const result = pairManager.getAllInvestingTickers();

      expect(mockPairRepo.getAllInvestingTickers).toHaveBeenCalled();
      expect(result).toEqual(mockTickers);
    });

    it('should return empty array when no tickers exist', () => {
      mockPairRepo.getAllInvestingTickers.mockReturnValue([]);

      const result = pairManager.getAllInvestingTickers();

      expect(result).toEqual([]);
    });
  });

  describe('createInvestingToPairMapping', () => {
    it('should create mapping through repository', () => {
      const investingTicker = 'HDFC';
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      pairManager.createInvestingToPairMapping(investingTicker, pairInfo);

      expect(mockPairRepo.pinPair).toHaveBeenCalledWith(investingTicker, pairInfo);
    });

    it('should handle multiple mappings', () => {
      const mappings = [
        { ticker: 'HDFC', pair: new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC') },
        { ticker: 'RELIANCE', pair: new PairInfo('Reliance Industries', '456', 'NSE', 'RELIANCE') },
        { ticker: 'TCS', pair: new PairInfo('Tata Consultancy Services', '789', 'NSE', 'TCS') },
      ];

      mappings.forEach(({ ticker, pair }) => {
        pairManager.createInvestingToPairMapping(ticker, pair);
      });

      expect(mockPairRepo.pinPair).toHaveBeenCalledTimes(3);
      mappings.forEach(({ ticker, pair }) => {
        expect(mockPairRepo.pinPair).toHaveBeenCalledWith(ticker, pair);
      });
    });
  });

  describe('investingTickerToPairInfo', () => {
    it('should return pair info for valid investing ticker', () => {
      const investingTicker = 'HDFC';
      const expectedPairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');
      mockPairRepo.getPairInfo.mockReturnValue(expectedPairInfo);

      const result = pairManager.investingTickerToPairInfo(investingTicker);

      expect(mockPairRepo.getPairInfo).toHaveBeenCalledWith(investingTicker);
      expect(result).toEqual(expectedPairInfo);
    });

    it('should return null for unknown investing ticker', () => {
      const investingTicker = 'UNKNOWN';
      mockPairRepo.getPairInfo.mockReturnValue(null);

      const result = pairManager.investingTickerToPairInfo(investingTicker);

      expect(mockPairRepo.getPairInfo).toHaveBeenCalledWith(investingTicker);
      expect(result).toBeNull();
    });

    it('should handle case-sensitive ticker lookups', () => {
      const lowerCaseTicker = 'hdfc';
      const upperCaseTicker = 'HDFC';

      mockPairRepo.getPairInfo.mockImplementation((ticker) =>
        ticker === upperCaseTicker ? new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC') : null
      );

      const lowerResult = pairManager.investingTickerToPairInfo(lowerCaseTicker);
      const upperResult = pairManager.investingTickerToPairInfo(upperCaseTicker);

      expect(lowerResult).toBeNull();
      expect(upperResult).not.toBeNull();
      expect(upperResult?.name).toBe('HDFC Bank');
    });
  });

  describe('deletePairInfo', () => {
    it('should delete pair info through repository', () => {
      const investingTicker = 'HDFC';

      pairManager.deletePairInfo(investingTicker);

      expect(mockPairRepo.delete).toHaveBeenCalledWith(investingTicker);
    });

    it('should handle deletion of non-existent ticker', () => {
      const nonExistentTicker = 'NONEXISTENT';

      // Should not throw error
      expect(() => {
        pairManager.deletePairInfo(nonExistentTicker);
      }).not.toThrow();

      expect(mockPairRepo.delete).toHaveBeenCalledWith(nonExistentTicker);
    });

    it('should handle multiple deletions', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];

      tickers.forEach((ticker) => {
        pairManager.deletePairInfo(ticker);
      });

      expect(mockPairRepo.delete).toHaveBeenCalledTimes(3);
      tickers.forEach((ticker) => {
        expect(mockPairRepo.delete).toHaveBeenCalledWith(ticker);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete lifecycle: create, retrieve, delete', () => {
      const investingTicker = 'HDFC';
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      // Setup repository to return the pair info after creation
      mockPairRepo.getPairInfo.mockReturnValue(pairInfo);
      mockPairRepo.getAllInvestingTickers.mockReturnValue([investingTicker]);

      // Create mapping
      pairManager.createInvestingToPairMapping(investingTicker, pairInfo);
      expect(mockPairRepo.pinPair).toHaveBeenCalledWith(investingTicker, pairInfo);

      // Retrieve mapping
      const retrieved = pairManager.investingTickerToPairInfo(investingTicker);
      expect(retrieved).toEqual(pairInfo);

      // Verify it's in the list of all tickers
      const allTickers = pairManager.getAllInvestingTickers();
      expect(allTickers).toContain(investingTicker);

      // Delete mapping
      pairManager.deletePairInfo(investingTicker);
      expect(mockPairRepo.delete).toHaveBeenCalledWith(investingTicker);
    });

    it('should handle empty state correctly', () => {
      mockPairRepo.getAllInvestingTickers.mockReturnValue([]);
      mockPairRepo.getPairInfo.mockReturnValue(null);

      const allTickers = pairManager.getAllInvestingTickers();
      const pairInfo = pairManager.investingTickerToPairInfo('ANYTHING');

      expect(allTickers).toEqual([]);
      expect(pairInfo).toBeNull();
    });

    it('should handle repository failures gracefully', () => {
      const investingTicker = 'HDFC';
      const pairInfo = new PairInfo('HDFC Bank', '123', 'NSE', 'HDFC');

      // Mock repository methods to throw errors
      mockPairRepo.pinPair.mockImplementation(() => {
        throw new Error('Repository error');
      });
      mockPairRepo.getPairInfo.mockImplementation(() => {
        throw new Error('Repository error');
      });
      mockPairRepo.delete.mockImplementation(() => {
        throw new Error('Repository error');
      });

      // Manager should not catch these errors - they should propagate up
      expect(() => {
        pairManager.createInvestingToPairMapping(investingTicker, pairInfo);
      }).toThrow('Repository error');

      expect(() => {
        pairManager.investingTickerToPairInfo(investingTicker);
      }).toThrow('Repository error');

      expect(() => {
        pairManager.deletePairInfo(investingTicker);
      }).toThrow('Repository error');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in ticker names', () => {
      const specialTicker = 'HDFC-EQ';
      const pairInfo = new PairInfo('HDFC Bank EQ', '123', 'NSE', 'HDFC-EQ');

      pairManager.createInvestingToPairMapping(specialTicker, pairInfo);

      expect(mockPairRepo.pinPair).toHaveBeenCalledWith(specialTicker, pairInfo);
    });

    it('should handle empty string tickers', () => {
      const emptyTicker = '';
      const pairInfo = new PairInfo('Empty', '123', 'NSE', '');

      pairManager.createInvestingToPairMapping(emptyTicker, pairInfo);

      expect(mockPairRepo.pinPair).toHaveBeenCalledWith(emptyTicker, pairInfo);
    });

    it('should handle very long ticker names', () => {
      const longTicker = 'A'.repeat(1000);
      const pairInfo = new PairInfo('Very Long Name', '123', 'NSE', longTicker);

      pairManager.createInvestingToPairMapping(longTicker, pairInfo);

      expect(mockPairRepo.pinPair).toHaveBeenCalledWith(longTicker, pairInfo);
    });
  });
});
