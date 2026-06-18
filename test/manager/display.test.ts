import { DisplayManager, IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IRecentManager } from '../../src/manager/recent';
import { DisplayState, DisplaySurface, DISPLAY_STATE_COLORS } from '../../src/models/display';
import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { Constants } from '../../src/models/constant';
import { WatchCategory, WatchCategoryId } from '../../src/models/watch';

describe('DisplayManager', () => {
  let displayManager: IDisplayManager;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  const READY_CATEGORY: WatchCategory = {
    id: WatchCategoryId.READY,
    color: 'red',
    label: 'Ready',
    recordUpdate: { state: 'READY' as any },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
      getBatchCategory: jest.fn(),
      evictTicker: jest.fn(),
      clearReadyState: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockDomManager = {
      getTickers: jest.fn().mockReturnValue(new Set<string>()),
      getTicker: jest.fn().mockReturnValue('CURRENT'),
      isScreenerVisible: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<IDomManager>;

    mockRecentManager = {
      isRecent: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    displayManager = new DisplayManager(mockCategoryManager, mockDomManager, mockRecentManager);
  });

  describe('resolve', () => {
    // ── Priority 1: UNMAPPED ──

    it('should return UNMAPPED/red for null ticker', async () => {
      const result = await displayManager.resolve({
        ticker: null,
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.UNMAPPED, color: 'red' });
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
    });

    // ── Priority 2: WATCH_CATEGORY ──

    it('should return WATCH_CATEGORY with category color when watch category exists and ticker is in watchlist', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:RELIANCE']));

      const result = await displayManager.resolve({
        ticker: 'TV:RELIANCE',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
    });

    it('should return DEFAULT when watch category exists but ticker is absent from DOM watchlist', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set<string>());

      const result = await displayManager.resolve({
        ticker: 'TV:ABSENT',
        surface: DisplaySurface.ALERT_FEED_ROW,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    // ── Priority 3: RECENT (alert feed only) ──

    it('should return RECENT/lime for alert feed when ticker is recent', async () => {
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

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'lime' });
    });

    it('should return DEFAULT (not RECENT) for HEADER_NAME when ticker is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await displayManager.resolve({
        ticker: 'TV:RECENT',
        surface: DisplaySurface.HEADER_NAME,
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
    });

    it('should return DEFAULT (not RECENT) for WATCHLIST_SYMBOL when ticker is recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:RECENT',
        surface: DisplaySurface.WATCHLIST_SYMBOL,
        watchlistTickers: new Set(['TV:RECENT']),
      });

      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
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

    // ── Preloaded context ──

    it('should use preloaded category without fetching from backend', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:PRE']));

      const result = await displayManager.resolve({
        ticker: 'TV:PRE',
        surface: DisplaySurface.HEADER_NAME,
        category: { watch: READY_CATEGORY, flag: undefined, isFno: false },
      });

      expect(result).toEqual({ state: DisplayState.WATCH_CATEGORY, color: 'red' });
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
    });

    it('should use preloaded watchlistTickers without calling DOM', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:WATCHED',
        surface: DisplaySurface.ALERT_FEED_ROW,
        watchlistTickers: new Set(['TV:WATCHED']),
      });

      // No watch category, so falls through to DEFAULT
      expect(result).toEqual({ state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT });
      expect(mockDomManager.getTickers).not.toHaveBeenCalled();
    });

    it('should use preloaded recentTickers without calling recent manager', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });

      const result = await displayManager.resolve({
        ticker: 'TV:RECENT',
        surface: DisplaySurface.ALERT_FEED_ROW,
        recentTickers: new Set(['TV:RECENT']),
      });

      expect(result).toEqual({ state: DisplayState.RECENT, color: 'lime' });
      expect(mockRecentManager.isRecent).not.toHaveBeenCalled();
    });
  });

  // ── DISPLAY_STATE_COLORS constants ──

  describe('DISPLAY_STATE_COLORS', () => {
    it('should define colors for UNMAPPED, DEFAULT, and RECENT', () => {
      expect(DISPLAY_STATE_COLORS[DisplayState.UNMAPPED]).toBe('red');
      expect(DISPLAY_STATE_COLORS[DisplayState.DEFAULT]).toBe('white');
      expect(DISPLAY_STATE_COLORS[DisplayState.RECENT]).toBe('lime');
    });
  });
});
