import { RecentManager, IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Ticker } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';

describe('RecentManager', () => {
  let recentManager: IRecentManager;
  let mockClient: jest.Mocked<ITickerClient>;
  let mockProducer: jest.Mocked<IPublisher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      getTicker: jest.fn(),
      patchTickerLastOpened: jest.fn().mockResolvedValue({} as any),
    } as unknown as jest.Mocked<ITickerClient>;

    mockProducer = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    recentManager = new RecentManager(mockClient, mockProducer);
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(recentManager).toBeDefined();
      expect(recentManager).toBeInstanceOf(RecentManager);
    });

    it('should NOT call backend on construction (on-demand fetch)', () => {
      expect(mockClient.getTicker).not.toHaveBeenCalled();
    });
  });

  describe('markRecent', () => {
    it('should add ticker to cache and fire backend patch', async () => {
      const ticker = 'RELIANCE';
      recentManager.markRecent(ticker);
      expect(await recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)).toBe(true);
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledWith(ticker, {
        last_opened_at: expect.any(String),
      });
    });

    it('should handle empty ticker string', async () => {
      const ticker = '';
      recentManager.markRecent(ticker);
      expect(await recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)).toBe(true);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['RELIANCE', 'TCS', 'HDFC'];
      tickers.forEach((t) => recentManager.markRecent(t));
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledTimes(3);
    });

    it('should publish TICKER_CHANGED after cache update', async () => {
      recentManager.markRecent('NSE:TCS');

      expect(mockProducer.publish).toHaveBeenCalledTimes(1);
      expect(mockProducer.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_CHANGED,
        ticker: 'NSE:TCS',
      });
    });
  });

  describe('isRecent', () => {
    it('should return true when ticker was marked within cutOffPeriod', async () => {
      recentManager.markRecent('TCS');
      expect(await recentManager.isRecent('TCS', Constants.RECENT_CUTOFF_MS)).toBe(true);
    });

    it('should return true with very large cutOffPeriod (effectively always)', async () => {
      recentManager.markRecent('TCS');
      expect(await recentManager.isRecent('TCS', Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should fetch from backend on cache miss and return true if recent', async () => {
      const recentDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
      mockClient.getTicker.mockResolvedValue(
        new Ticker({ ticker: 'BACKEND_TICKER', last_opened_at: recentDate })
      );

      const result = await recentManager.isRecent('BACKEND_TICKER', Constants.RECENT_CUTOFF_MS);

      expect(result).toBe(true);
      expect(mockClient.getTicker).toHaveBeenCalledWith('BACKEND_TICKER');
    });

    it('should return false when ticker not in cache and not in backend', async () => {
      mockClient.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await recentManager.isRecent('UNKNOWN', Constants.RECENT_CUTOFF_MS);

      expect(result).toBe(false);
      expect(mockClient.getTicker).toHaveBeenCalledWith('UNKNOWN');
    });

    it('should return false for empty ticker string when not cached', async () => {
      expect(await recentManager.isRecent('', Constants.RECENT_CUTOFF_MS)).toBe(false);
    });

    it('should return false for negative cutOffPeriod (impossible window)', async () => {
      recentManager.markRecent('NOW');
      expect(await recentManager.isRecent('NOW', -1)).toBe(false);
    });

    it('should cache result and not call backend again on second lookup', async () => {
      const recentDate = new Date(Date.now() - 60 * 1000).toISOString();
      mockClient.getTicker.mockResolvedValue(
        new Ticker({ ticker: 'CACHED', last_opened_at: recentDate })
      );

      // First call — cache miss, fetches from backend
      const first = await recentManager.isRecent('CACHED', Constants.RECENT_CUTOFF_MS);
      expect(first).toBe(true);
      expect(mockClient.getTicker).toHaveBeenCalledTimes(1);

      // Second call — cache hit
      jest.clearAllMocks();
      const second = await recentManager.isRecent('CACHED', Constants.RECENT_CUTOFF_MS);
      expect(second).toBe(true);
      expect(mockClient.getTicker).not.toHaveBeenCalled();
    });

    it('should reflect markRecent in cache immediately (before backend)', async () => {
      // isRecent returns false initially (not cached, no backend record)
      mockClient.getTicker.mockRejectedValue(new Error('Not found'));
      expect(await recentManager.isRecent('NEW_TICKER', Constants.RECENT_CUTOFF_MS)).toBe(false);

      // markRecent sets cache directly
      recentManager.markRecent('NEW_TICKER');
      expect(await recentManager.isRecent('NEW_TICKER', Constants.RECENT_CUTOFF_MS)).toBe(true);
      // No backend getTicker for the isRecent call — cache hit
    });
  });

  describe('error handling', () => {
    it('should handle backend getTicker failure gracefully', async () => {
      mockClient.getTicker.mockRejectedValue(new Error('Backend unavailable'));

      const result = await recentManager.isRecent('ANY', Constants.RECENT_CUTOFF_MS);

      expect(result).toBe(false);
    });

    it('should handle backend patch failure gracefully', () => {
      mockClient.patchTickerLastOpened.mockRejectedValue(new Error('Patch failed'));
      const ticker = 'RESILIENT';
      // Should not throw — errors are silently caught
      expect(() => recentManager.markRecent(ticker)).not.toThrow();
    });

    it('should not throw when ticker not in cache', async () => {
      mockClient.getTicker.mockRejectedValue(new Error('Not found'));
      await expect(recentManager.isRecent('MISSING', Constants.RECENT_CUTOFF_MS)).resolves.toBe(false);
    });
  });
});
