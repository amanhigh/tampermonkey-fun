import { HeaderManager, IHeaderManager } from '../../src/manager/header';
import { IPaintManager } from '../../src/manager/paint';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';
import { IDomManager } from '../../src/manager/dom';
import { IFnoManager } from '../../src/manager/fno';
import { Constants } from '../../src/models/constant';
import { FlagCategoryId } from '../../src/models/flag';
import { WatchCategoryId } from '../../src/models/watch';

// Mock jQuery
const mockJQueryElement = {
  css: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnValue([]),
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock PaintManager
    mockPaintManager = {
      paintSymbols: jest.fn(),
      paintFlags: jest.fn(),
      resetColors: jest.fn(),
      paintFNOMarking: jest.fn(),
    } as jest.Mocked<IPaintManager>;

    // Mock WatchManager
    mockWatchManager = {
      getTickerCategory: jest.fn(),
      getTickerCategories: jest.fn(),
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
      mockFnoManager
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
      mockFlagManager.getTickerCategory.mockReturnValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      // Verify ticker was retrieved
      expect(mockTickerManager.getTicker).toHaveBeenCalledTimes(1);

      // Verify DOM elements were selected
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.NAME);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.FLAGS.MARKING);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.BASIC.EXCHANGE);

      // Verify CSS was applied
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.DEFAULT);

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
      mockFlagManager.getTickerCategory.mockReturnValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      expect(mockWatchManager.getTickerCategory).toHaveBeenCalledWith(ticker, expect.any(Array));
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
    });

    it('should use brown override for DEFAULT_DAILY category', async () => {
      const ticker = 'NSE:NIFTY';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue({
        id: WatchCategoryId.DEFAULT_DAILY,
        color: 'white',
        label: 'Default / Daily',
        recordUpdate: null,
      });
      mockFlagManager.getTickerCategory.mockReturnValue(undefined);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      // DEFAULT_DAILY should use brown (colorList[6])
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', Constants.UI.COLORS.LIST[6]);
    });

    it('should paint flag and exchange elements with flag colors', async () => {
      const ticker = 'NSE:TCS';
      const flagCategory = { id: FlagCategoryId.DOWNTREND, color: Constants.UI.COLORS.LIST[1], label: '', update: {} };

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockReturnValue(flagCategory);
      mockFnoManager.isFno.mockReturnValue(false);

      await headerManager.paintHeader();

      expect(mockFlagManager.getTickerCategory).toHaveBeenCalledTimes(1);
      // Flag and exchange should be colored with flag category color
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', flagCategory.color);
    });

    it('should paint FNO marking when ticker is in FNO repo', async () => {
      const ticker = 'NSE:HDFC';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue(undefined);
      mockFlagManager.getTickerCategory.mockReturnValue(undefined);
      mockFnoManager.isFno.mockReturnValue(true);

      await headerManager.paintHeader();

      expect(mockFnoManager.isFno).toHaveBeenCalledWith(ticker);
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });

    it('should handle ticker in both watch and flag categories', async () => {
      const ticker = 'NSE:BANKNIFTY';

      mockTickerManager.getTicker.mockReturnValue(ticker);
      mockWatchManager.getTickerCategory.mockResolvedValue({
        id: WatchCategoryId.SET_JOURNAL,
        color: 'orange',
        label: 'Set Trades',
        recordUpdate: null,
      });
      mockFlagManager.getTickerCategory.mockReturnValue({ id: FlagCategoryId.SIDEWAYS, color: 'orange', label: '', update: {} });
      mockFnoManager.isFno.mockReturnValue(true);

      await headerManager.paintHeader();

      // Name should be colored with watch category color
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
      // FNO marking should be painted
      expect(mockPaintManager.paintFNOMarking).toHaveBeenCalledWith(mockJQueryElement, true);
    });
  });

  describe('error handling', () => {
    it('should handle getTickerCategory errors gracefully', async () => {
      const error = new Error('Watch category failed');
      mockTickerManager.getTicker.mockReturnValue('NSE:TEST');
      mockWatchManager.getTickerCategory.mockRejectedValue(error);

      await expect(headerManager.paintHeader()).rejects.toThrow('Watch category failed');
    });

    it('should handle ticker manager errors gracefully', async () => {
      const error = new Error('Ticker retrieval failed');
      mockTickerManager.getTicker.mockImplementation(() => {
        throw error;
      });

      await expect(headerManager.paintHeader()).rejects.toThrow('Ticker retrieval failed');
    });
  });
});
