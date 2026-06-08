import { HeaderManager, IHeaderManager } from '../../src/manager/header';
import { IPaintManager } from '../../src/manager/paint';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { IDomManager } from '../../src/manager/dom';
import { IFnoManager } from '../../src/manager/fno';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { Constants } from '../../src/models/constant';
import { FlagCategoryId } from '../../src/models/flag';
import { WatchCategoryId } from '../../src/models/watch';

// Mock jQuery
const mockCssFn = jest.fn().mockReturnThis();
let mockToArrayResult: { textContent: string | null; innerHTML: string }[] = [];

const mockJQueryElement = {
  css: mockCssFn,
  toArray: jest.fn().mockImplementation(() => mockToArrayResult),
};
const mockJQuery = jest.fn(() => mockJQueryElement);
(global as any).$ = mockJQuery;

describe('HeaderManager', () => {
  let headerManager: IHeaderManager;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockFlagManager: jest.Mocked<IFlagManager>;
  let mockTickerManager: jest.Mocked<IDomManager>;
  let mockFnoManager: jest.Mocked<IFnoManager>;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToArrayResult = [];

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    // Mock WatchManager — getTickerCategory is the only method
    mockWatchManager = {
      getTickerCategory: jest.fn(),
      classifyTickers: jest.fn(),
      recordCategory: jest.fn(),
    } as jest.Mocked<IWatchManager>;

    // Mock FlagManager
    mockFlagManager = {
      getTickerCategory: jest.fn(),
      recordCategory: jest.fn(),
      paint: jest.fn(),
    } as jest.Mocked<IFlagManager>;

    // Mock DomManager
    mockTickerManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      getSelectedTickers: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
      getRenderedTickers: jest.fn(),
    };

    // Mock WatchlistManager
    mockWatchlistManager = {
      getTickers: jest.fn().mockReturnValue([]),
      getSelectedTickers: jest.fn(),
      paintWatchList: jest.fn(),
      applyDefaultFilters: jest.fn(),
    };

    // Mock FnoManager
    mockFnoManager = {
      isFno: jest.fn(),
      getAllFnoTickers: jest.fn(),
    } as jest.Mocked<IFnoManager>;

    headerManager = new HeaderManager(
      mockPaintManager,
      mockWatchManager,
      mockFlagManager,
      mockTickerManager,
      mockFnoManager,
      mockWatchlistManager
    );
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(headerManager).toBeDefined();
      expect(headerManager).toBeInstanceOf(HeaderManager);
    });
  });

  describe('paintHeader', () => {
    beforeEach(() => {
      mockTickerManager.getTicker.mockReturnValue('NSE:RELIANCE');
      mockJQuery.mockReturnValue(mockJQueryElement);
    });

    it('should paint header with all components', async () => {
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      // Verify ticker was retrieved
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Verify DOM elements were selected
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.NAME);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.FLAGS.MARKING);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);

      // Verify CSS was applied (default white since no category)
      expect(mockCssFn).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);

      // Verify paint manager was called for FNO marking
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, false);
    });

    it('should paint name element with category color when ticker has watch category', async () => {
      const ticker = 'NSE:RELIANCE';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue({
        id: WatchCategoryId.READY,
        color: 'red',
        label: 'Ready',
        recordUpdate: { state: 'READY' },
      });
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      // getTickerCategory now takes only ticker (no watchlist array)
      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith(ticker);
      expect(mockCssFn).toHaveBeenCalledWith('color', 'red');
    });

    it('should use brown override for uncategorized ticker in watchlist', async () => {
      const ticker = 'NSE:NIFTY';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      // Ticker is in the watchlist → brown override
      mockWatchlistManager.getTickers.mockReturnValue([ticker]);

      await headerManager.paintHeader();

      // No category but ticker is in watchlist → brown
      expect(mockCssFn).toHaveBeenCalledWith('color', Constants.UI.COLORS.HEADER_DEFAULT);
    });

    it('should use default white for uncategorized ticker not in watchlist', async () => {
      const ticker = 'NSE:UNKNOWN';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      // Ticker is NOT in the watchlist → stays default white
      mockWatchlistManager.getTickers.mockReturnValue(['NSE:OTHER']);

      await headerManager.paintHeader();

      // No category + not in watchlist → stays default white
      expect(mockCssFn).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);
    });

    it('should paint flag and exchange elements with flag colors', async () => {
      const ticker = 'NSE:TCS';
      const flagCategory = { id: FlagCategoryId.DOWNTREND, color: Constants.UI.COLORS.SCREENER_RECENT, label: '', update: {} };

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(flagCategory);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      expect(mockFlagManager.getTickerCategory).toHaveBeenCalledTimes(1);
      expect(mockCssFn).toHaveBeenCalledWith('color', flagCategory.color);
    });

    it('should paint FNO marking when ticker is in FNO repo', async () => {
      const ticker = 'NSE:HDFC';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockResolvedValue(undefined);
      mockFnoManager.isFno.mockReturnValue(true);

      await headerManager.paintHeader();

      expect(mockFnoManager.isFno).toHaveBeenCalledWith(ticker);
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });
  });
});
