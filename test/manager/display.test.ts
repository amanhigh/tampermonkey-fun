import { DisplayManager, IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IRecentManager } from '../../src/manager/recent';
import { DisplayState } from '../../src/models/display';
import { Constants } from '../../src/models/constant';
import { WatchCategory, WatchCategoryId } from '../../src/models/watch';

describe('DisplayManager', () => {
  let displayManager: IDisplayManager;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  const READY_CATEGORY: WatchCategory = {
    id: WatchCategoryId.READY,
    color: 'red',
    label: 'Ready',
    recordUpdate: { state: 'READY' as any },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock GM.getValue for watchlist silo reads
    (global as any).GM = {
      getValue: jest.fn().mockResolvedValue(null),
      setValue: jest.fn().mockResolvedValue(undefined),
    };

    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
      getBatchCategory: jest.fn(),
      evictTicker: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockRecentManager = {
      isRecent: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    displayManager = new DisplayManager(mockCategoryManager, mockRecentManager);
  });

  describe('resolve', () => {
    // ── Priority 1: UNMAPPED ──

    it('should return UNMAPPED/purple for null ticker', async () => {
      const result = await displayManager.resolve(null);

      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'purple' });
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    // ── Priority 2: WATCH_CATEGORY ──

    it('should return WATCH_CATEGORY when watch category exists and ticker is in watchlist silo', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });

      // Simulate watchlist silo containing the ticker
      const siloData = JSON.stringify({
        tickers: ['TV:RELIANCE'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve('TV:RELIANCE');

      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('TV:RELIANCE');
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    it('should return RECENT/gold when watch category exists but ticker is absent from watchlist silo and is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      // Simulate watchlist silo without the ticker
      const siloData = JSON.stringify({
        tickers: ['TV:SOMEOTHER'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve('TV:ABSENT');

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'gold' });
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('TV:ABSENT');
      expect(mockRecentManager.isRecent).toHaveBeenCalled();
    });

    it('should return UNMAPPED/purple when watch category exists but ticker is absent from watchlist silo and not recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(false);

      // Simulate watchlist silo without the ticker
      const siloData = JSON.stringify({
        tickers: ['TV:SOMEOTHER'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve('TV:ABSENT');

      // Absent from watchlist → treated as untracked → UNMAPPED/purple
      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'purple' });
    });

    it('should return RECENT/gold when silo is null, category exists, and ticker is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      // GM.getValue returns null (no silo data yet)
      (global as any).GM.getValue.mockResolvedValue(null);

      const result = await displayManager.resolve('TV:ABSENT');

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'gold' });
    });

    // ── No category + recency ──

    it('should return RECENT/gold when ticker has no watch category but is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await displayManager.resolve('TV:RECENT');

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'gold' });
    });

    it('should return DEFAULT/white when tracked ticker has no watch category and is not recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(false);

      // TV:PLAIN is tracked (in watchlist) but has no watch category
      const siloData = JSON.stringify({
        tickers: ['TV:PLAIN'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve('TV:PLAIN');

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    // ── CMG regression: category + in silo + recent → category wins ──

    it('should return WATCH_CATEGORY/red for CMG when silo contains CMG even if recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      // CMG is in the watchlist silo
      const siloData = JSON.stringify({
        tickers: ['CMG', 'XAGUSD'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve('CMG');

      // Category (READY → red) wins over RECENT (gold)
      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
    });
  });
});
