import { DisplayManager, IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IRecentManager } from '../../src/manager/recent';
import { FeedState } from '../../src/models/alertfeed';
import { TickerArea } from '../../src/models/dom';
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

  // ── resolve ──

  describe('resolve', () => {
    it('should return UNMAPPED/red for null ticker', async () => {
      const result = await displayManager.resolve(null, 'ALERT_FEED');

      expect(result).toEqual({ color: 'red', feedState: FeedState.UNMAPPED });
      expect(mockCategoryManager.getTickerCategory).not.toHaveBeenCalled();
    });

    it('should return WATCHED/yellow when watch category exists and ticker is in DOM watchlist', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:RELIANCE']));
      mockRecentManager.isRecent.mockResolvedValue(false);

      const result = await displayManager.resolve('TV:RELIANCE', 'ALERT_FEED');

      expect(result).toEqual({ color: 'yellow', feedState: FeedState.WATCHED });
    });

    it('should return RECENT/lime when watch category exists but ticker absent from watchlist and recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set<string>());
      mockRecentManager.isRecent.mockResolvedValue(true);

      const result = await displayManager.resolve('TV:ABSENT', 'ALERT_FEED');

      expect(result).toEqual({ color: 'lime', feedState: FeedState.RECENT });
    });

    it('should return MAPPED/white when ticker is mapped but not watched or recent', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: undefined,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set<string>());
      mockRecentManager.isRecent.mockResolvedValue(false);

      const result = await displayManager.resolve('TV:PLAIN', 'ALERT_FEED');

      expect(result).toEqual({ color: 'white', feedState: FeedState.MAPPED });
    });

    it('should return watch category color for HEADER when ticker is in DOM watchlist', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:RELIANCE']));

      const result = await displayManager.resolve('TV:RELIANCE', 'HEADER');

      expect(result).toEqual({ color: 'red', feedState: FeedState.MAPPED });
    });

    it('should return DEFAULT for HEADER when ticker is absent from DOM watchlist', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: READY_CATEGORY,
        flag: undefined,
        isFno: false,
      });
      mockDomManager.getTickers.mockReturnValue(new Set<string>());

      const result = await displayManager.resolve('TV:ABSENT', 'HEADER');

      expect(result).toEqual({ color: Constants.UI.COLORS.DEFAULT, feedState: FeedState.MAPPED });
    });
  });

  // ── resolveColor ──

  describe('resolveColor', () => {
    it('should return watch category color for WATCHLIST area', () => {
      const color = displayManager.resolveColor(READY_CATEGORY, true, false, TickerArea.WATCHLIST);

      expect(color).toBe('red');
    });

    it('should return DEFAULT for WATCHLIST area without watch category', () => {
      const color = displayManager.resolveColor(undefined, true, false, TickerArea.WATCHLIST);

      expect(color).toBe(Constants.UI.COLORS.DEFAULT);
    });

    it('should return watch category color for SCREENER when ticker is in DOM watchlist', () => {
      const color = displayManager.resolveColor(READY_CATEGORY, true, false, TickerArea.SCREENER);

      expect(color).toBe('red');
    });

    it('should fall through for SCREENER when watch category exists but ticker absent from watchlist', () => {
      const color = displayManager.resolveColor(READY_CATEGORY, false, false, TickerArea.SCREENER);

      expect(color).toBe(Constants.UI.COLORS.DEFAULT);
    });

    it('should return HEADER_DEFAULT for SCREENER when ticker is in watchlist without category', () => {
      const color = displayManager.resolveColor(undefined, true, false, TickerArea.SCREENER);

      expect(color).toBe(Constants.UI.COLORS.HEADER_DEFAULT);
    });

    it('should return SCREENER_RECENT for SCREENER when ticker is recent', () => {
      const color = displayManager.resolveColor(undefined, false, true, TickerArea.SCREENER);

      expect(color).toBe(Constants.UI.COLORS.SCREENER_RECENT);
    });

    it('should return DEFAULT for SCREENER when ticker is neither in watchlist nor recent', () => {
      const color = displayManager.resolveColor(undefined, false, false, TickerArea.SCREENER);

      expect(color).toBe(Constants.UI.COLORS.DEFAULT);
    });
  });

  // ── resolveHeaderColor ──

  describe('resolveHeaderColor', () => {
    it('should return watch category color when ticker is in DOM watchlist', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:RELIANCE']));

      const color = await displayManager.resolveHeaderColor('TV:RELIANCE', READY_CATEGORY);

      expect(color).toBe('red');
    });

    it('should return HEADER_DEFAULT when ticker is in DOM watchlist without category', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['TV:RELIANCE']));

      const color = await displayManager.resolveHeaderColor('TV:RELIANCE', undefined);

      expect(color).toBe(Constants.UI.COLORS.HEADER_DEFAULT);
    });

    it('should return DEFAULT when ticker is absent from DOM watchlist', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set<string>());

      const color = await displayManager.resolveHeaderColor('TV:ABSENT', READY_CATEGORY);

      expect(color).toBe(Constants.UI.COLORS.DEFAULT);
    });
  });
});
