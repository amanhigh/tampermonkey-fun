import { RecentManager, IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { TickerRecord } from '../../src/models/ticker';

describe('RecentManager', () => {
  let recentManager: IRecentManager;
  let mockClient: jest.Mocked<ITickerClient>;

  const mockRecentTickers: TickerRecord[] = [
    { ticker: 'RELIANCE', last_opened_at: '2026-05-05T10:30:00Z', exchange: null, timeframes: ['MN', 'WK', 'DL'], type: 'EQUITY', state: 'WATCHED', trend: 'UPTREND', is_fno: false, created_at: '2026-05-05T10:30:00Z', updated_at: '2026-05-05T10:30:00Z' },
    { ticker: 'TCS', last_opened_at: '2026-05-04T10:30:00Z', exchange: null, timeframes: ['MN', 'WK', 'DL'], type: 'EQUITY', state: 'WATCHED', trend: 'SIDEWAYS', is_fno: false, created_at: '2026-05-04T10:30:00Z', updated_at: '2026-05-04T10:30:00Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TickerClient
    mockClient = {
      listAllTickers: jest.fn().mockResolvedValue(mockRecentTickers),
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
      expect(mockClient.listAllTickers).toHaveBeenCalledWith({
        'sort-by': 'last_opened_at',
        'sort-order': 'desc',
      });
    });
  });

  describe('markRecent', () => {
    it('should add ticker to cache and fire backend patch', () => {
      const ticker = 'RELIANCE';
      recentManager.markRecent(ticker);
      expect(recentManager.isRecent(ticker)).toBe(true);
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledWith(ticker, {
        last_opened_at: expect.any(String),
      });
    });

    it('should handle empty ticker string', () => {
      const ticker = '';
      recentManager.markRecent(ticker);
      expect(recentManager.isRecent(ticker)).toBe(true);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['RELIANCE', 'TCS', 'HDFC'];
      tickers.forEach((t) => recentManager.markRecent(t));
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRecent', () => {
    it('should return true when ticker exists in cache', () => {
      recentManager.markRecent('TCS');
      expect(recentManager.isRecent('TCS')).toBe(true);
    });

    it('should return false when ticker does not exist in cache', () => {
      expect(recentManager.isRecent('UNKNOWN')).toBe(false);
    });

    it('should return false for empty ticker string when not cached', () => {
      expect(recentManager.isRecent('')).toBe(false);
    });

    it('should return false when ticker timestamp is older than sinceMs cutoff', () => {
      recentManager.markRecent('OLD');
      const recentTimestamp = Date.now();
      // Use a cutoff in the future so the ticker appears stale
      expect(recentManager.isRecent('OLD', { sinceMs: recentTimestamp + 10000 })).toBe(false);
    });

    it('should return true when ticker timestamp is newer than sinceMs cutoff', () => {
      recentManager.markRecent('FRESH');
      const recentTimestamp = Date.now();
      // Use a cutoff in the past so the ticker appears recent
      expect(recentManager.isRecent('FRESH', { sinceMs: recentTimestamp - 10000 })).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle backend listAllTickers failure gracefully', () => {
      mockClient.listAllTickers.mockRejectedValue(new Error('Backend unavailable'));
      const resilientManager = new RecentManager(mockClient);
      expect(resilientManager.isRecent('RELIANCE')).toBe(false);
    });

    it('should handle patchTickerLastOpened failure gracefully', () => {
      mockClient.patchTickerLastOpened.mockRejectedValue(new Error('Patch failed'));
      const ticker = 'RELIANCE';
      expect(() => recentManager.markRecent(ticker)).not.toThrow();
      expect(recentManager.isRecent(ticker)).toBe(true);
    });
  });
});
