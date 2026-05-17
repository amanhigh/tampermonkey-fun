import { RecentManager, IRecentManager } from '../../src/manager/recent';
import { IPaintManager } from '../../src/manager/paint';
import { ITickerClient } from '../../src/client/ticker';
import { TickerRecord } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';

describe('RecentManager', () => {
  let recentManager: IRecentManager;
  let mockClient: jest.Mocked<ITickerClient>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

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

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as jest.Mocked<IPaintManager>;

    recentManager = new RecentManager(mockClient, mockPaintManager);
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

  describe('addTicker', () => {
    it('should add ticker to cache and fire backend patch', () => {
      const ticker = 'RELIANCE';
      recentManager.addTicker(ticker);
      expect(recentManager.isRecent(ticker)).toBe(true);
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledWith(ticker, {
        last_opened_at: expect.any(String),
      });
    });

    it('should handle empty ticker string', () => {
      const ticker = '';
      recentManager.addTicker(ticker);
      expect(recentManager.isRecent(ticker)).toBe(true);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['RELIANCE', 'TCS', 'HDFC'];
      tickers.forEach((t) => recentManager.addTicker(t));
      expect(mockClient.patchTickerLastOpened).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRecent', () => {
    it('should return true when ticker exists in cache', () => {
      recentManager.addTicker('TCS');
      expect(recentManager.isRecent('TCS')).toBe(true);
    });

    it('should return false when ticker does not exist in cache', () => {
      expect(recentManager.isRecent('UNKNOWN')).toBe(false);
    });

    it('should return false for empty ticker string when not cached', () => {
      expect(recentManager.isRecent('')).toBe(false);
    });
  });

  describe('getLastOpenedTimestamp', () => {
    it('should return timestamp for cached ticker', () => {
      recentManager.addTicker('RELIANCE');
      expect(recentManager.getLastOpenedTimestamp('RELIANCE')).toBeGreaterThan(0);
    });

    it('should return 0 for unknown ticker', () => {
      expect(recentManager.getLastOpenedTimestamp('UNKNOWN')).toBe(0);
    });
  });

  describe('removeRecentTicker', () => {
    it('should remove ticker from cache', () => {
      recentManager.addTicker('RELIANCE');
      expect(recentManager.isRecent('RELIANCE')).toBe(true);
      recentManager.removeRecentTicker('RELIANCE');
      expect(recentManager.isRecent('RELIANCE')).toBe(false);
    });

    it('should not throw when removing non-existent ticker', () => {
      expect(() => recentManager.removeRecentTicker('UNKNOWN')).not.toThrow();
    });
  });

  describe('clearRecent', () => {
    it('should clear all tickers from cache', () => {
      recentManager.addTicker('RELIANCE');
      recentManager.addTicker('TCS');
      expect(recentManager.isRecent('RELIANCE')).toBe(true);
      recentManager.clearRecent();
      expect(recentManager.isRecent('RELIANCE')).toBe(false);
      expect(recentManager.isRecent('TCS')).toBe(false);
    });

    it('should not throw when cache is already empty', () => {
      expect(() => recentManager.clearRecent()).not.toThrow();
    });
  });

  describe('paintRecent', () => {
    it('should paint recent tickers with correct color and selector', () => {
      recentManager.addTicker('RELIANCE');
      recentManager.paintRecent();
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(
        Constants.DOM.SCREENER.SYMBOL,
        expect.any(Set),
        { color: Constants.UI.COLORS.LIST[1] }
      );
    });

    it('should paint empty set when no recent tickers', () => {
      recentManager.paintRecent();
      expect(mockPaintManager.paintSymbols).toHaveBeenCalledWith(
        Constants.DOM.SCREENER.SYMBOL,
        new Set(),
        { color: Constants.UI.COLORS.LIST[1] }
      );
    });
  });

  describe('error handling', () => {
    it('should handle backend listAllTickers failure gracefully', () => {
      mockClient.listAllTickers.mockRejectedValue(new Error('Backend unavailable'));
      const resilientManager = new RecentManager(mockClient, mockPaintManager);
      expect(resilientManager.isRecent('RELIANCE')).toBe(false);
      expect(resilientManager.getLastOpenedTimestamp('RELIANCE')).toBe(0);
    });

    it('should handle patchTickerLastOpened failure gracefully', () => {
      mockClient.patchTickerLastOpened.mockRejectedValue(new Error('Patch failed'));
      const ticker = 'RELIANCE';
      expect(() => recentManager.addTicker(ticker)).not.toThrow();
      expect(recentManager.isRecent(ticker)).toBe(true);
    });
  });
});
