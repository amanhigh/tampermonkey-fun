import { RecentManager, IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { Ticker } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';

describe('RecentManager', () => {
  let recentManager: IRecentManager;
  let mockClient: jest.Mocked<ITickerClient>;

  const mockRecentTickers: Ticker[] = [
    new Ticker({ ticker: 'RELIANCE', last_opened_at: '2026-05-05T10:30:00Z' }),
    new Ticker({ ticker: 'TCS', last_opened_at: '2026-05-04T10:30:00Z' }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TickerClient
    mockClient = {
      listTickers: jest.fn().mockResolvedValue(mockRecentTickers),
      patchTickerLastOpened: jest.fn().mockResolvedValue({} as any),
    } as unknown as jest.Mocked<ITickerClient>;

    recentManager = new RecentManager(mockClient);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(recentManager).toBeDefined();
      expect(recentManager).toBeInstanceOf(RecentManager);
    });

    it('should trigger cache load from backend on construction', () => {
      expect(mockClient.listTickers).toHaveBeenCalledWith({
        'sort-by': 'last_opened_at',
        'sort-order': 'desc',
      });
    });
  });

  describe('markRecent', () => {
    it('should add ticker to cache and fire backend patch', () => {
      const ticker = 'RELIANCE';
      recentManager.markRecent(ticker);
      expect(recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)).toBe(true);
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledWith(ticker, {
        last_opened_at: expect.any(String),
      });
    });

    it('should handle empty ticker string', () => {
      const ticker = '';
      recentManager.markRecent(ticker);
      expect(recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)).toBe(true);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['RELIANCE', 'TCS', 'HDFC'];
      tickers.forEach((t) => recentManager.markRecent(t));
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRecent', () => {
    it('should return true when ticker was marked within cutOffPeriod', () => {
      recentManager.markRecent('TCS');
      expect(recentManager.isRecent('TCS', Constants.RECENT_CUTOFF_MS)).toBe(true);
    });

    it('should return true with very large cutOffPeriod (effectively always)', () => {
      recentManager.markRecent('TCS');
      expect(recentManager.isRecent('TCS', Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should return false when ticker does not exist in cache', () => {
      expect(recentManager.isRecent('UNKNOWN', Constants.RECENT_CUTOFF_MS)).toBe(false);
    });

    it('should return false for empty ticker string when not cached', () => {
      expect(recentManager.isRecent('', Constants.RECENT_CUTOFF_MS)).toBe(false);
    });

    it('should return false for negative cutOffPeriod (impossible window)', () => {
      recentManager.markRecent('NOW');
      expect(recentManager.isRecent('NOW', -1)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle backend listTickers failure gracefully', () => {
      mockClient.listTickers.mockRejectedValue(new Error('Backend unavailable'));
      const resilientManager = new RecentManager(mockClient);
      // Should not throw during construction
      expect(resilientManager).toBeDefined();
    });

    it('should handle backend patch failure gracefully', () => {
      mockClient.patchTickerLastOpened.mockRejectedValue(new Error('Patch failed'));
      const ticker = 'RESILIENT';
      // Should not throw — errors are silently caught
      expect(() => recentManager.markRecent(ticker)).not.toThrow();
    });

    it('should not throw when ticker not in cache', () => {
      expect(() => recentManager.isRecent('MISSING', Constants.RECENT_CUTOFF_MS)).not.toThrow();
    });
  });
});
