import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerClient } from '../../src/client/ticker';
import { IPaintManager } from '../../src/manager/paint';
import { Ticker } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
  },
}));

describe('FlagManager', () => {
  let flagManager: IFlagManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

  // ── Helpers ──

  /**
   * Wait for fire-and-forget cache load to settle.
   */
  async function waitForCache(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Helper to build a minimal ticker fixture.
   */
  function makeTicker(overrides: Partial<Ticker> = {}): Ticker {
    const defaults: Partial<Ticker> = {
      ticker: 'TICKER',
      trend: 'SIDEWAYS',
      type: 'EQUITY',
    };
    return new Ticker({ ...defaults, ...overrides });
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerClient = {
      listTickers: jest.fn().mockResolvedValue([]),
      updateTicker: jest.fn().mockResolvedValue({} as any),
    } as unknown as jest.Mocked<ITickerClient>;

    mockPaintManager = {
      paintFlags: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    flagManager = new FlagManager(mockTickerClient, mockPaintManager);
  });

  // ── 1.1 Constructor / Cache ──

  describe('constructor and cache initialization', () => {
    it('should create instance with dependencies', () => {
      expect(flagManager).toBeDefined();
      expect(flagManager).toBeInstanceOf(FlagManager);
    });

    it('should call listTickers on construction', () => {
      expect(mockTickerClient.listTickers).toHaveBeenCalledWith({});
    });

    it('should initialise all 8 category cache sets', () => {
      // Even before cache resolves, categories return empty sets
      for (let i = 0; i < 8; i++) {
        expect(flagManager.getCategory(i)).toBeInstanceOf(Set);
        expect(flagManager.getCategory(i).size).toBe(0);
      }
    });

    it('should handle listTickers failure gracefully', () => {
      mockTickerClient.listTickers.mockRejectedValue(new Error('Backend down'));
      const resilient = new FlagManager(mockTickerClient, mockPaintManager);
      expect(resilient).toBeDefined();
    });
  });

  // ── 1.2 Category Mapping ──

  describe('category mapping from backend data', () => {
    it('should map SIDEWAYS trend to category 0', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(0).has('SIDE_A')).toBe(true);
    });

    it('should map DOWNTREND trend to category 1', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'DOWN_A', trend: 'DOWNTREND' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(1).has('DOWN_A')).toBe(true);
    });

    it('should map CRYPTO type to category 2', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(2).has('BTC')).toBe(true);
    });

    it('should map UPTREND trend to category 4', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'UP_A', trend: 'UPTREND' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(4).has('UP_A')).toBe(true);
    });

    it('should map INDEX type to category 6', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'NIFTY', type: 'INDEX' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(6).has('NIFTY')).toBe(true);
    });

    it('should map COMMODITY type to category 6', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'GOLD', type: 'COMMODITY' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(6).has('GOLD')).toBe(true);
    });

    it('should map gold-relative COMPOSITE to category 7', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'BTCUSD/XAUUSD', type: 'COMPOSITE' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(7).has('BTCUSD/XAUUSD')).toBe(true);
    });

    it('should follow display priority: 7 > 2 > 6 > 4 > 0 > 1', async () => {
      // Ticker has both CRYPTO type and UPTREND trend — should go to cat 2
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      expect(flagManager.getCategory(2).has('ETH')).toBe(true);
      expect(flagManager.getCategory(4).has('ETH')).toBe(false);
    });

    it('should map EQUITY SIDEWAYS ticker to category 0', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ABC', type: 'EQUITY', trend: 'SIDEWAYS' }),
      ]);
      flagManager = new FlagManager(mockTickerClient, mockPaintManager);
      await waitForCache();

      // ABC is EQUITY + SIDEWAYS. SIDEWAYS maps to cat 0 but EQUITY doesn't
      // map to any type category. It should go to cat 0 since SIDEWAYS is in priority.
      expect(flagManager.getCategory(0).has('ABC')).toBe(true);
    });
  });

  // ── 1.3 recordCategory ──

  describe('recordCategory', () => {
    it('should optimistically update cache for category 0 (SIDEWAYS)', () => {
      flagManager.recordCategory(0, ['TEST']);

      expect(flagManager.getCategory(0).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'SIDEWAYS' });
    });

    it('should optimistically update cache for category 1 (DOWNTREND)', () => {
      flagManager.recordCategory(1, ['TEST']);

      expect(flagManager.getCategory(1).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'DOWNTREND' });
    });

    it('should optimistically update cache for category 2 (CRYPTO)', () => {
      flagManager.recordCategory(2, ['TEST']);

      expect(flagManager.getCategory(2).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'CRYPTO' });
    });

    it('should optimistically update cache for category 4 (UPTREND)', () => {
      flagManager.recordCategory(4, ['TEST']);

      expect(flagManager.getCategory(4).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'UPTREND' });
    });

    it('should optimistically update cache for category 6 (INDEX)', () => {
      flagManager.recordCategory(6, ['TEST']);

      expect(flagManager.getCategory(6).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should optimistically update cache for category 7 (COMPOSITE)', () => {
      flagManager.recordCategory(7, ['TEST']);

      expect(flagManager.getCategory(7).has('TEST')).toBe(true);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE' });
    });

    it('should enforce mutual exclusivity across categories', () => {
      flagManager.recordCategory(0, ['TICKER_A']);
      flagManager.recordCategory(4, ['TICKER_A']);

      expect(flagManager.getCategory(0).has('TICKER_A')).toBe(false);
      expect(flagManager.getCategory(4).has('TICKER_A')).toBe(true);
    });

    it('should handle category 3 with warning and no backend call', () => {
      const { Notifier } = jest.requireMock('../../src/util/notify');
      flagManager.recordCategory(3, ['TEST']);

      expect(Notifier.warn).toHaveBeenCalledWith('Category 3 is not supported for storage');
      expect(mockTickerClient.updateTicker).not.toHaveBeenCalled();
    });

    it('should handle category 5 with warning and no backend call', () => {
      const { Notifier } = jest.requireMock('../../src/util/notify');
      flagManager.recordCategory(5, ['TEST']);

      expect(Notifier.warn).toHaveBeenCalledWith('Category 5 is not supported for storage');
      expect(mockTickerClient.updateTicker).not.toHaveBeenCalled();
    });

    it('should throw for out-of-range category index', () => {
      expect(() => flagManager.recordCategory(-1, ['T'])).toThrow(
        'Invalid category index: -1. Must be between 0 and 7'
      );
      expect(() => flagManager.recordCategory(8, ['T'])).toThrow(
        'Invalid category index: 8. Must be between 0 and 7'
      );
    });

    it('should handle empty ticker array', () => {
      flagManager.recordCategory(0, []);
      expect(mockTickerClient.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── 1.4 paint ──

  describe('paint', () => {
    it('should paint flags for all categories with correct colors', () => {
      const selector = '.symbol';
      const itemSelector = '.item';

      flagManager.paint(selector, itemSelector);

      const colorList = Constants.UI.COLORS.LIST;
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);

      for (let i = 0; i < colorList.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
          selector,
          expect.any(Set),
          colorList[i],
          itemSelector
        );
      }
    });

    it('should handle empty categories during paint', () => {
      const selector = '.symbol';
      const itemSelector = '.item';

      flagManager.paint(selector, itemSelector);

      const colorList = Constants.UI.COLORS.LIST;
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);

      // All sets should be empty
      for (let i = 0; i < colorList.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
          selector,
          new Set(),
          colorList[i],
          itemSelector
        );
      }
    });
  });

  // ── 1.5 evictTicker ──

  describe('evictTicker', () => {
    it('should remove ticker from cached categories', () => {
      flagManager.recordCategory(4, ['TARGET']);
      expect(flagManager.getCategory(4).has('TARGET')).toBe(true);

      const result = flagManager.evictTicker('TARGET');

      expect(flagManager.getCategory(4).has('TARGET')).toBe(false);
      expect(result).toBe(true);
    });

    it('should return false when ticker is absent', () => {
      const result = flagManager.evictTicker('MISSING');
      expect(result).toBe(false);
    });
  });

  // ── 1.6 getCategory edge cases ──

  describe('getCategory', () => {
    it('should throw for negative category index', () => {
      expect(() => flagManager.getCategory(-1)).toThrow('Invalid category index: -1. Must be between 0 and 7');
    });

    it('should throw for category index >= 8', () => {
      expect(() => flagManager.getCategory(8)).toThrow('Invalid category index: 8. Must be between 0 and 7');
    });

    it('should return category set for valid indexes', () => {
      for (let i = 0; i < 8; i++) {
        const set = flagManager.getCategory(i);
        expect(set).toBeInstanceOf(Set);
      }
    });
  });
});
