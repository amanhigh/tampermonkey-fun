import { DisplayManager, IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IRecentManager } from '../../src/manager/recent';
import { DisplayState, DisplaySurface } from '../../src/models/display';
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
      clearReadyState: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockRecentManager = {
      isRecent: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    displayManager = new DisplayManager(mockCategoryManager, mockRecentManager);
  });

  describe('resolve', () => {
    // ── Priority 1: UNMAPPED ──

    it('should return UNMAPPED/firebrick for null ticker', async () => {
      const result = await displayManager.resolve({
        ticker: null,
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'firebrick' });
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
    });

    // ── HEADER_NAME ──

    it('should return WATCH_CATEGORY for HEADER_NAME when watch category exists', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:RELIANCE',
        surface: DisplaySurface.HEADER_NAME,
      });

      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('TV:RELIANCE');
    });

    it('should return DEFAULT for HEADER_NAME when no watch category exists', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:PLAIN',
        surface: DisplaySurface.HEADER_NAME,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    // ── Priority 2: WATCH_CATEGORY (alert feed) via silo ──

    it('should return WATCH_CATEGORY for ALERT_FEED_ROW when watch category exists and ticker is in watchlist silo', async () => {
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

      const result = await displayManager.resolve({
        ticker: 'TV:RELIANCE',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
      expect((global as any).GM.getValue).toHaveBeenCalledWith(Constants.STORAGE.SILOS.WATCHLIST);
    });

    it('should return DEFAULT when watch category exists but ticker is absent from watchlist silo', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });

      // Simulate watchlist silo without the ticker
      const siloData = JSON.stringify({
        tickers: ['TV:SOMEOTHER'],
        updatedAt: new Date().toISOString(),
      });
      (global as any).GM.getValue.mockResolvedValue(siloData);

      const result = await displayManager.resolve({
        ticker: 'TV:ABSENT',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    it('should return DEFAULT when watchlist silo is null (no data yet)', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });

      // GM.getValue returns null (no silo data)
      (global as any).GM.getValue.mockResolvedValue(null);

      const result = await displayManager.resolve({
        ticker: 'TV:ABSENT',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    // ── CMG case: category exists, ticker in silo, also recent → category wins ──

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

      const result = await displayManager.resolve({
        ticker: 'CMG',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      // Category (READY → red) wins over RECENT (gold)
      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
    });

    // ── Priority 3: RECENT (alert feed only) ──

    it('should return RECENT/gold for alert feed when ticker is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await displayManager.resolve({
        ticker: 'TV:RECENT',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'gold' });
    });

    it('should return DEFAULT (not RECENT) for HEADER_NAME when ticker is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:RECENT',
        surface: DisplaySurface.HEADER_NAME,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
      // Header does not check recency
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });

    // ── Priority 4: DEFAULT ──

    it('should return DEFAULT/white for mapped ticker with no category or recency', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(false);

      const result = await displayManager.resolve({
        ticker: 'TV:PLAIN',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });
  });
});
