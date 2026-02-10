import { Alert, PairInfo } from '../../src/models/alert';
import { IPairManager, PairManager } from '../../src/manager/pair';
import { IPairRepo } from '../../src/repo/pair';
import { ISymbolManager } from '../../src/manager/symbol';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { IRecentTickerRepo } from '../../src/repo/recent';
import { ISequenceRepo } from '../../src/repo/sequence';
import { IExchangeRepo } from '../../src/repo/exchange';
import { IAlertRepo } from '../../src/repo/alert';
import { IInvestingClient } from '../../src/client/investing';

// Mock Notifier to avoid DOM issues in tests
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    red: jest.fn(),
  },
}));

describe('PairManager', () => {
  let pairManager: IPairManager;
  let mockPairRepo: jest.Mocked<IPairRepo>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockFlagManager: jest.Mocked<IFlagManager>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;
  let mockRecentRepo: jest.Mocked<IRecentTickerRepo>;
  let mockSequenceRepo: jest.Mocked<ISequenceRepo>;
  let mockExchangeRepo: jest.Mocked<IExchangeRepo>;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;
  let mockInvestingClient: jest.Mocked<IInvestingClient>;

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

    // Mock other managers
    mockSymbolManager = {
      investingToTv: jest.fn(),
      tvToInvesting: jest.fn(),
      removeTvToInvestingMapping: jest.fn(),
    } as unknown as jest.Mocked<ISymbolManager>;

    mockWatchManager = {
      isWatched: jest.fn(),
      evictTicker: jest.fn(),
    } as unknown as jest.Mocked<IWatchManager>;

    mockFlagManager = {
      evictTicker: jest.fn(),
      'flagRepo': {
        getFlagCategoryLists: jest.fn(),
      },
    } as unknown as jest.Mocked<IFlagManager>;

    mockAlertFeedManager = {
      createAlertFeedEvent: jest.fn(),
    } as unknown as jest.Mocked<IAlertFeedManager>;

    mockRecentRepo = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<IRecentTickerRepo>;

    mockSequenceRepo = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<ISequenceRepo>;

    mockExchangeRepo = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<IExchangeRepo>;

    mockAlertRepo = {
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IAlertRepo>;

    mockInvestingClient = {
      deleteAlert: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IInvestingClient>;

    pairManager = new PairManager(
      mockPairRepo,
      mockSymbolManager,
      mockWatchManager,
      mockFlagManager,
      mockAlertFeedManager,
      mockRecentRepo,
      mockSequenceRepo,
      mockExchangeRepo,
      mockAlertRepo,
      mockInvestingClient
    );
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

  describe('stopTrackingByInvestingTicker', () => {
    it('should delete pair info through repository', () => {
      const investingTicker = 'HDFC';

      pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockPairRepo.delete).toHaveBeenCalledWith(investingTicker);
    });

    it('should handle deletion of non-existent ticker', () => {
      const nonExistentTicker = 'NONEXISTENT';

      expect(() => {
        pairManager.stopTrackingByInvestingTicker(nonExistentTicker);
      }).not.toThrow();

      expect(mockPairRepo.delete).toHaveBeenCalledWith(nonExistentTicker);
    });

    it('should handle multiple deletions', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];

      tickers.forEach((ticker) => {
        pairManager.stopTrackingByInvestingTicker(ticker);
      });

      expect(mockPairRepo.delete).toHaveBeenCalledTimes(3);
      tickers.forEach((ticker) => {
        expect(mockPairRepo.delete).toHaveBeenCalledWith(ticker);
      });
    });

    it('should cleanup watchlist and flags when tvTicker exists', () => {
      const investingTicker = 'HDFC';
      const tvTicker = 'TV:HDFC';

      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.evictTicker.mockReturnValue(true);
      mockFlagManager.evictTicker.mockReturnValue(true);

      const result = pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockWatchManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockFlagManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockSymbolManager.removeTvToInvestingMapping).toHaveBeenCalledWith(investingTicker);
      expect(mockAlertFeedManager.createAlertFeedEvent).toHaveBeenCalledWith(tvTicker);
      expect(mockRecentRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(mockSequenceRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(mockExchangeRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(true);
    });

    it('should skip cleanup when tvTicker does not exist', () => {
      const investingTicker = 'HDFC';

      mockSymbolManager.investingToTv.mockReturnValue(null);

      const result = pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockWatchManager.evictTicker).not.toHaveBeenCalled();
      expect(mockFlagManager.evictTicker).not.toHaveBeenCalled();
      expect(mockAlertFeedManager.createAlertFeedEvent).not.toHaveBeenCalled();
      expect(mockRecentRepo.delete).not.toHaveBeenCalled();
      expect(mockSequenceRepo.delete).not.toHaveBeenCalled();
      expect(mockExchangeRepo.delete).not.toHaveBeenCalled();

      expect(mockPairRepo.delete).toHaveBeenCalledWith(investingTicker);
      expect(mockSymbolManager.removeTvToInvestingMapping).toHaveBeenCalledWith(investingTicker);
      expect(result).toBe(false);
    });

    it('should return true when at least one cleanup succeeds', () => {
      const investingTicker = 'HDFC';
      const tvTicker = 'TV:HDFC';

      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.evictTicker.mockReturnValue(false);
      mockFlagManager.evictTicker.mockReturnValue(true);

      const result = pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockWatchManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockFlagManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(true);
    });

    it('should return false when both cleanups fail', () => {
      const investingTicker = 'HDFC';
      const tvTicker = 'TV:HDFC';

      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.evictTicker.mockReturnValue(false);
      mockFlagManager.evictTicker.mockReturnValue(false);

      const result = pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockWatchManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockFlagManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(false);
    });

    it('should delete alerts when pairInfo exists', () => {
      const investingTicker = 'HDFC';
      const pairInfo = new PairInfo('HDFC', '123', 'NSE', 'HDFC');
      const alerts = [new Alert('a1', '123', 100), new Alert('a2', '123', 200)];

      mockPairRepo.getPairInfo.mockReturnValue(pairInfo);
      mockAlertRepo.get.mockReturnValue(alerts);

      pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockAlertRepo.get).toHaveBeenCalledWith('123');
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockAlertRepo.delete).toHaveBeenCalledWith('123');
    });

    it('should skip alert deletion when no pairInfo', () => {
      const investingTicker = 'HDFC';

      mockPairRepo.getPairInfo.mockReturnValue(null);

      pairManager.stopTrackingByInvestingTicker(investingTicker);

      expect(mockAlertRepo.get).not.toHaveBeenCalled();
      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
    });
  });

  describe('stopTrackingByTvTicker', () => {
    it('should delegate to stopTrackingByInvestingTicker when investing mapping exists', () => {
      const tvTicker = 'HDFC';
      const investingTicker = 'INV:HDFC';

      mockSymbolManager.tvToInvesting.mockReturnValue(investingTicker);
      mockSymbolManager.investingToTv.mockReturnValue(tvTicker);
      mockWatchManager.evictTicker.mockReturnValue(true);
      mockFlagManager.evictTicker.mockReturnValue(false);

      const result = pairManager.stopTrackingByTvTicker(tvTicker);

      expect(mockSymbolManager.tvToInvesting).toHaveBeenCalledWith(tvTicker);
      expect(mockPairRepo.delete).toHaveBeenCalledWith(investingTicker);
      expect(mockSymbolManager.removeTvToInvestingMapping).toHaveBeenCalledWith(investingTicker);
      expect(mockWatchManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(true);
    });

    it('should cleanup tvTicker stores when no investing mapping', () => {
      const tvTicker = 'ORPHAN_TV';

      mockSymbolManager.tvToInvesting.mockReturnValue(null);
      mockWatchManager.evictTicker.mockReturnValue(false);
      mockFlagManager.evictTicker.mockReturnValue(true);

      const result = pairManager.stopTrackingByTvTicker(tvTicker);

      // Should NOT touch pair repo or symbol mapping
      expect(mockPairRepo.delete).not.toHaveBeenCalled();
      expect(mockSymbolManager.removeTvToInvestingMapping).not.toHaveBeenCalled();

      // Should still clean tvTicker-keyed stores
      expect(mockWatchManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockFlagManager.evictTicker).toHaveBeenCalledWith(tvTicker);
      expect(mockAlertFeedManager.createAlertFeedEvent).toHaveBeenCalledWith(tvTicker);
      expect(mockRecentRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(mockSequenceRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(mockExchangeRepo.delete).toHaveBeenCalledWith(tvTicker);
      expect(result).toBe(true);
    });

    it('should return false when no investing mapping and no list cleanup', () => {
      const tvTicker = 'ORPHAN_TV';

      mockSymbolManager.tvToInvesting.mockReturnValue(null);
      mockWatchManager.evictTicker.mockReturnValue(false);
      mockFlagManager.evictTicker.mockReturnValue(false);

      const result = pairManager.stopTrackingByTvTicker(tvTicker);

      expect(result).toBe(false);
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
      pairManager.stopTrackingByInvestingTicker(investingTicker);
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
        pairManager.stopTrackingByInvestingTicker(investingTicker);
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
