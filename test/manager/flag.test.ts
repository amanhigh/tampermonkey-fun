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
   * Wait for async paint / backend calls to settle.
   */
  async function waitForAsync(): Promise<void> {
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

    it('should initialise all 8 category sets as empty', () => {
      for (let i = 0; i < 8; i++) {
        expect(flagManager.getCategory(i)).toBeInstanceOf(Set);
        expect(flagManager.getCategory(i).size).toBe(0);
      }
    });
  });

  // ── getCategory ──

  describe('getCategory', () => {
    it('should throw for negative category index', () => {
      expect(() => flagManager.getCategory(-1)).toThrow('Invalid category index: -1. Must be between 0 and 7');
    });

    it('should throw for category index >= 8', () => {
      expect(() => flagManager.getCategory(8)).toThrow('Invalid category index: 8. Must be between 0 and 7');
    });

    it('should return empty set for all categories before any paint', () => {
      for (let i = 0; i < 8; i++) {
        expect(flagManager.getCategory(i).size).toBe(0);
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

    it('should call updateTicker for category 6 (INDEX)', () => {
      flagManager.recordCategory(6, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'INDEX' });
    });

    it('should call updateTicker for category 7 (COMPOSITE)', () => {
      flagManager.recordCategory(7, ['TEST']);

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TEST', { type: 'COMPOSITE' });
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

    it('should NOT mutate local getCategory snapshot', () => {
      flagManager.recordCategory(0, ['TICKER_A']);

      expect(flagManager.getCategory(0).has('TICKER_A')).toBe(false);
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

  // ── paint ──

  describe('paint', () => {
    it('should call listTickers every paint', () => {
      flagManager.paint('.sel', '.item');

      expect(mockTickerClient.listTickers).toHaveBeenCalledWith({});
    });

    it('should group tickers by category and call paintFlags', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'SIDE_A', trend: 'SIDEWAYS' }),      // → cat 0
        makeTicker({ ticker: 'DOWN_A', trend: 'DOWNTREND' }),      // → cat 1
        makeTicker({ ticker: 'BTC', type: 'CRYPTO' }),             // → cat 2
        makeTicker({ ticker: 'UP_A', trend: 'UPTREND' }),          // → cat 4
        makeTicker({ ticker: 'NIFTY', type: 'INDEX' }),            // → cat 6
        makeTicker({ ticker: 'BTCUSD/XAUUSD', type: 'COMPOSITE' }),
      ]);

      flagManager.paint('.sym', '.itm');
      await waitForAsync();

      const colorList = Constants.UI.COLORS.LIST;
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);

      // Cat 0 → orange
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['SIDE_A']), colorList[0], '.itm'
      );
      // Cat 1 → red
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['DOWN_A']), colorList[1], '.itm'
      );
      // Cat 2 → dodgerblue
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['BTC']), colorList[2], '.itm'
      );
      // Cat 4 → lime
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['UP_A']), colorList[4], '.itm'
      );
      // Cat 6 → brown
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['NIFTY']), colorList[6], '.itm'
      );
      // Cat 7 → darkkhaki
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith(
        '.sym', new Set(['BTCUSD/XAUUSD']), colorList[7], '.itm'
      );
    });

    it('should handle empty ticker list', async () => {
      mockTickerClient.listTickers.mockResolvedValue([]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      const colorList = Constants.UI.COLORS.LIST;
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(colorList.length);
      for (let i = 0; i < colorList.length; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(), colorList[i], '.item');
      }
    });

    it('should handle backend failure gracefully', async () => {
      mockTickerClient.listTickers.mockRejectedValue(new Error('Backend down'));

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).not.toHaveBeenCalled();
    });

    it('should apply display priority: 7 > 2 > 6 > 4 > 0 > 1', async () => {
      // Ticker has both CRYPTO type and UPTREND trend → should go to cat 2
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'ETH', type: 'CRYPTO', trend: 'UPTREND' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(['ETH']), Constants.UI.COLORS.LIST[2], '.item');
    });

    it('should call paintFlags for all 8 categories even when some are empty', async () => {
      mockTickerClient.listTickers.mockResolvedValue([
        makeTicker({ ticker: 'A', trend: 'SIDEWAYS' }),
      ]);

      flagManager.paint('.sel', '.item');
      await waitForAsync();

      const colorList = Constants.UI.COLORS.LIST;
      expect(mockPaintManager.paintFlags).toHaveBeenCalledTimes(8);
      // Cat 0 should have 'A', others empty
      expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(['A']), colorList[0], '.item');
      for (let i = 1; i < 8; i++) {
        expect(mockPaintManager.paintFlags).toHaveBeenCalledWith('.sel', new Set(), colorList[i], '.item');
      }
    });
  });
});
