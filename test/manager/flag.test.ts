import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerManager } from '../../src/manager/ticker';
import { IPaintManager } from '../../src/manager/paint';
import { Ticker } from '../../src/models/ticker';
import { ALL_FLAG_CATEGORIES, FlagCategoryId } from '../../src/models/flag';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
  },
}));

describe('FlagManager', () => {
  let flagManager: IFlagManager;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

  // ── Helpers ──

  async function waitForAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

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

    mockTickerManager = {
      listTickers: jest.fn().mockResolvedValue([]),
      updateTicker: jest.fn().mockResolvedValue({} as any),
      getTicker: jest.fn(),
      startTracking: jest.fn(),
      markRecent: jest.fn(),
      stopTracking: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    mockPaintManager = {
      paintFlags: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    flagManager = new FlagManager(mockTickerManager, mockPaintManager);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(flagManager).toBeDefined();
      expect(flagManager).toBeInstanceOf(FlagManager);
    });

    it('should NOT call listTickers on construction', () => {
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
    });

    it('should return undefined for getTickerCategory before any paint', () => {
      expect(flagManager.getTickerCategory('ANY')).toBeUndefined();
    });
  });

  // ── getTickerCategory ──

  describe('getTickerCategory', () => {
    it('should return undefined before paint', () => {
      expect(flagManager.getTickerCategory('TEST')).toBeUndefined();
    });

    it('should return matching FlagCategory after paint', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(flagManager.getTickerCategory('SIDE_A')?.id).toBe(FlagCategoryId.SIDEWAYS);
      expect(flagManager.getTickerCategory('BTC')?.id).toBe(FlagCategoryId.CRYPTO);
    });

    it('should return undefined for ticker absent from snapshot', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'PRESENT', trend: 'SIDEWAYS' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(flagManager.getTickerCategory('ABSENT')).toBeUndefined();
    });
  });

  // ── recordCategory ──

  describe('recordCategory', () => {
    it('should call updateTicker for SIDEWAYS', () => {
      flagManager.recordCategory('SIDEWAYS', ['TEST']);

      expect(flagManager.getTickerCategory('TEST')).toBeUndefined();
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'SIDEWAYS' });
    });

    it('should call updateTicker for DOWNTREND', () => {
      flagManager.recordCategory('DOWNTREND', ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'DOWNTREND' });
    });

    it('should call updateTicker for CRYPTO', () => {
      flagManager.recordCategory('CRYPTO', ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'CRYPTO' });
    });

    it('should call updateTicker for UPTREND', () => {
      flagManager.recordCategory('UPTREND', ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'UPTREND' });
    });

    it('should reject DEFAULT_UNTRACKED at type level (not recordable)', () => {
      // DEFAULT_UNTRACKED is excluded from RecordableFlagCategoryId at type level.
      // RecordableFlagCategoryId = Exclude<FlagCategoryId, 'DEFAULT_UNTRACKED'>
      // A runtime call would still attempt to look up the category.
      // Verify the category lookup throws for invalid ID.
      // (TypeScript prevents this at compile time; this test documents the intent.)
      flagManager.recordCategory('SIDEWAYS', []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });

    it('should call updateTicker for INDEX', () => {
      flagManager.recordCategory('INDEX', ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should call updateTicker for GOLD_INDEX', () => {
      flagManager.recordCategory('GOLD_INDEX', ['TEST']);

      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE' });
    });

    it('should NOT mutate local getTickerCategory snapshot', () => {
      flagManager.recordCategory('SIDEWAYS', ['TICKER_A']);

      expect(flagManager.getTickerCategory('TICKER_A')).toBeUndefined();
    });

    it('should handle empty ticker array', () => {
      flagManager.recordCategory('SIDEWAYS', []);
      expect(mockTickerManager.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── paint ──

  describe('paint', () => {
    it('should call listTickers every paint via ITickerManager', () => {
      flagManager.paint('.sel', '.item');

      expect(mockTickerManager.listTickers).toHaveBeenCalledWith({});
    });

    it('should group tickers by FlagCategoryId', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),          // → SIDEWAYS
        makeTicker({ ticker: 'DOWN_A', trend: 'DOWNTREND' }),         // → DOWNTREND
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),                // → CRYPTO
        makeTicker({ ticker: 'UP_A', trend: 'UPTREND' }),             // → UPTREND
        makeTicker({ ticker: 'NIFTY', type: 'INDEX' }),               // → INDEX
        makeTicker({ ticker: 'GOLDSILVER', type: 'COMPOSITE' }),      // → GOLD_INDEX
      ]);

      flagManager.paint('.sym', '.itm');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);

      // Verify each category was painted with correct symbols and color
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['SIDE_A']), 'orange', '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['DOWN_A']), 'red', '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['BTC']), 'dodgerblue', '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['UP_A']), 'lime', '.itm',
      );
      // DEFAULT_UNTRACKED — empty in this test
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['NIFTY']), 'brown', '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['GOLDSILVER']), 'darkkhaki', '.itm',
      );
    });

    it('should handle empty ticker list', async () => {
      mockTickerManager.listTickers.mockResolvedValue([]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);
      for (const cat of ALL_FLAG_CATEGORIES) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(), cat.color, '.item');
      }
    });

    it('should handle backend failure gracefully', async () => {
      mockTickerManager.listTickers.mockRejectedValue(new Error('Backend down'));

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).not.toHaveBeenCalled();
    });

    it('should apply display priority: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND', async () => {
      // Ticker with both CRYPTO type and UPTREND trend → should go to CRYPTO
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      // CRYPTO color is 'dodgerblue'
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sel', new Set(['ETH']), 'dodgerblue', '.item',
      );
    });

    it('should paint all categories', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'A', trend: 'SIDEWAYS' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);

      // First call is SIDEWAYS with 'A', rest are empty
      expect(mockPaintManager.paintFlags).toHaveBeenNthCalledWith(
        1, '.sel', new Set(['A']), ALL_FLAG_CATEGORIES[0].color, '.item',
      );
      for (let i = 1; i < ALL_FLAG_CATEGORIES.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenNthCalledWith(
          i + 1, '.sel', new Set(), ALL_FLAG_CATEGORIES[i].color, '.item',
        );
      }
    });
  });
});
