import { DisplayManager, IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerManager } from '../../src/manager/ticker';
import { DisplayState } from '../../src/models/display';
import { Constants } from '../../src/models/constant';
import { ApiError } from '../../src/models/api_error';
import { WatchCategory, WatchCategoryId } from '../../src/models/watch';

describe('DisplayManager', () => {
  let displayManager: IDisplayManager;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;

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

    mockTickerManager = {
      getTicker: jest.fn().mockResolvedValue({ ticker: 'EXISTING' }),
      updateTicker: jest.fn(),
      markRecent: jest.fn(),
      listTickers: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    displayManager = new DisplayManager(mockCategoryManager, mockRecentManager, mockTickerManager);
  });

  describe('resolve', () => {
    // ── Priority 1: UNMAPPED ──

    it('should return UNMAPPED/purple for null ticker', async () => {
      const result = await displayManager.resolve(null);

      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'purple' });
      expect(mockTickerManager.getTicker).not.toHaveBeenCalled();
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    // ── Priority 2: Backend 404 (untracked) ──

    it('should return UNMAPPED/purple when ticker fails backend existence check (404)', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new ApiError(404, 'Not found'));

      const result = await displayManager.resolve('TV:UNTRACKED');

      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'purple' });
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('TV:UNTRACKED');
      // Should short-circuit — no further lookups
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    it('should propagate non-404 errors from backend existence check', async () => {
      const serverError = new ApiError(500, 'Internal server error');
      mockTickerManager.getTicker.mockRejectedValue(serverError);

      await expect(displayManager.resolve('TV:ERROR')).rejects.toThrow(serverError);
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
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('TV:RELIANCE');
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

      // Absent from loaded silo → category skipped → recent wins → RECENT/gold
      expect(result).toEqual({ state: DisplayState.RECENT, color: 'gold' });
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('TV:ABSENT');
      expect(mockRecentManager.isRecent).toHaveBeenCalledWith('TV:ABSENT', expect.any(Number));
    });

    it('should return DEFAULT/white when watch category exists but ticker is absent from watchlist silo and not recent', async () => {
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

      // Absent from watchlist → category skipped, not recent → DEFAULT/white
      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
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
