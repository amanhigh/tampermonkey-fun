import { FlagManager, IFlagManager } from '../../src/manager/flag';
import { ITickerClient } from '../../src/client/ticker';
import { IPaintManager } from '../../src/manager/paint';
import { Ticker } from '../../src/models/ticker';
import { ALL_FLAG_CATEGORIES } from '../../src/models/flag';

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

    mockTickerClient = {
      listTickers: jest.fn().mockResolvedValue([]),
      updateTicker: jest.fn().mockResolvedValue({} as any),
      getTicker: jest.fn(),
    } as unknown as jest.Mocked<ITickerClient>;

    mockPaintManager = {
      paintFlags: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    flagManager = new FlagManager(mockTickerClient, mockPaintManager);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('should create instance with dependencies', () => {
      expect(flagManager).toBeDefined();
      expect(flagManager).toBeInstanceOf(FlagManager);
    });

    it('should NOT call listTickers on construction', () => {
      expect(mockTickerClient.listTickers).not.toHaveBeenCalled();
    });

    it('should initialise all category sets as empty', () => {
      for (const cat of ALL_FLAG_CATEGORIES) {
        const c = flagManager.getCategory(cat.index);
        expect(c).toBeInstanceOf(Set);
        expect(c.size).toBe(0);
      }
    });
  });

  // ── getCategory ──

  describe('getCategory', () => {
    it('should throw for negative category index', () => {
      expect(() => flagManager.getCategory(-1)).toThrow('Invalid category index: -1');
    });

    it('should throw for unsupported category index 3 (was UNUSED)', () => {
      expect(() => flagManager.getCategory(3)).toThrow('Invalid category index: 3');
    });

    it('should throw for category index >= 8', () => {
      expect(() => flagManager.getCategory(8)).toThrow('Invalid category index: 8');
    });

    it('should return empty set for all categories before any paint', () => {
      for (const cat of ALL_FLAG_CATEGORIES) {
        expect(flagManager.getCategory(cat.index).size).toBe(0);
      }
    });

    it('should return populated sets after paint completes', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(flagManager.getCategory(0).has('SIDE_A')).toBe(true);
      expect(flagManager.getCategory(2).has('BTC')).toBe(true);
    });
  });

  // ── recordCategory ──

  describe('recordCategory', () => {
    it('should call updateTicker for category 0 (SIDEWAYS)', () => {
      flagManager.recordCategory(0, ['TEST']);

      expect(flagManager.getCategory(0).has('TEST')).toBe(false);
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'SIDEWAYS' });
    });

    it('should call updateTicker for category 1 (DOWNTREND)', () => {
      flagManager.recordCategory(1, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'DOWNTREND' });
    });

    it('should call updateTicker for category 2 (CRYPTO)', () => {
      flagManager.recordCategory(2, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'CRYPTO' });
    });

    it('should call updateTicker for category 4 (UPTREND)', () => {
      flagManager.recordCategory(4, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { trend: 'UPTREND' });
    });

    it('should call updateTicker as NOOP for category 5 (DEFAULT_UNTRACKED)', () => {
      flagManager.recordCategory(5, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', {});
    });

    it('should call updateTicker for category 6 (INDEX)', () => {
      flagManager.recordCategory(6, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should call updateTicker for category 7 (GOLD_INDEX)', () => {
      flagManager.recordCategory(7, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE' });
    });

    it('should throw for removed category index 3', () => {
      expect(() => flagManager.recordCategory(3, ['TEST'])).toThrow('Invalid category index: 3');
    });

    it('should NOT mutate local getCategory snapshot', () => {
      flagManager.recordCategory(0, ['TICKER_A']);

      expect(flagManager.getCategory(0).has('TICKER_A')).toBe(false);
    });

    it('should throw for out-of-range category index', () => {
      expect(() => flagManager.recordCategory(-1, ['T'])).toThrow('Invalid category index: -1');
      expect(() => flagManager.recordCategory(8, ['T'])).toThrow('Invalid category index: 8');
    });

    it('should handle empty ticker array', () => {
      flagManager.recordCategory(0, []);
      expect(mockTickerClient.updateTicker).not.toHaveBeenCalled();
    });
  });

  // ── paint ──

  describe('paint', () => {
    it('should call listTickers every paint', () => {
      flagManager.paint('.sel', '.item');

      expect(mockTickerClient.listTickers).toHaveBeenCalledWith({});
    });

    it('should group tickers by category using FlagCategory matches', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),          // → SIDEWAYS (idx 0)
        makeTicker({ ticker: 'DOWN_A', trend: 'DOWNTREND' }),         // → DOWNTREND (idx 1)
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),                // → CRYPTO (idx 2)
        makeTicker({ ticker: 'UP_A', trend: 'UPTREND' }),             // → UPTREND (idx 4)
        makeTicker({ ticker: 'NIFTY', type: 'INDEX' }),               // → INDEX (idx 6)
        makeTicker({ ticker: 'GOLDSILVER', type: 'COMPOSITE' }),   // → GOLD_INDEX (idx 7)
      ]);

      flagManager.paint('.sym', '.itm');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);

      // Verify each category was painted with correct symbols and color
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['SIDE_A']), ALL_FLAG_CATEGORIES[0].color, '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['DOWN_A']), ALL_FLAG_CATEGORIES[1].color, '.itm',
      );
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['BTC']), ALL_FLAG_CATEGORIES[2].color, '.itm',
      );
      // UPTREND is ALL_FLAG_CATEGORIES[3]
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['UP_A']), ALL_FLAG_CATEGORIES[3].color, '.itm',
      );
      // DEFAULT_UNTRACKED is [4] — empty in this test
      // INDEX is ALL_FLAG_CATEGORIES[5]
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['NIFTY']), ALL_FLAG_CATEGORIES[5].color, '.itm',
      );
      // GOLD_INDEX is ALL_FLAG_CATEGORIES[6]
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['GOLDSILVER']), ALL_FLAG_CATEGORIES[6].color, '.itm',
      );
    });

    it('should handle empty ticker list', async () => {
      mockTickerClient.listTickers.mockResolvedValue([]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);
      for (const cat of ALL_FLAG_CATEGORIES) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(), cat.color, '.item');
      }
    });

    it('should handle backend failure gracefully', async () => {
      mockTickerClient.listTickers.mockRejectedValue(new Error('Backend down'));

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).not.toHaveBeenCalled();
    });

    it('should apply display priority: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND', async () => {
      // Ticker with both CRYPTO type and UPTREND trend → should go to CRYPTO
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      // CRYPTO is ALL_FLAG_CATEGORIES[2]
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sel', new Set(['ETH']), ALL_FLAG_CATEGORIES[2].color, '.item',
      );
    });

    it('should paint all categories via FlagCategory objects', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'A', trend: 'SIDEWAYS' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(ALL_FLAG_CATEGORIES.length);

      // Cat 0 (SIDEWAYS) should have 'A', others empty
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sel', new Set(['A']), ALL_FLAG_CATEGORIES[0].color, '.item',
      );
      for (let i = 1; i < ALL_FLAG_CATEGORIES.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
          '.sel', new Set(), ALL_FLAG_CATEGORIES[i].color, '.item',
        );
      }
    });
  });
});
