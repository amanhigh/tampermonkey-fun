import { TimeFrameManager, ITimeFrameManager } from '../../src/manager/timeframe';
import { ITickerManager } from '../../src/manager/ticker';
import { IDomManager } from '../../src/manager/dom';
import { Ticker } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';

// Mock jQuery with simplified approach - avoid complex interface typing
const mockJQuery = jest.fn();
(global as any).$ = mockJQuery;

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
    message: jest.fn(),
  },
}));

describe('TimeFrameManager', () => {
  let timeFrameManager: ITimeFrameManager;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  const createMockTicker = (overrides: Partial<Ticker> = {}): Ticker =>
    new Ticker({
      ticker: 'TEST',
      exchange: 'NSE',
      timeframes: ['TMN', 'MN', 'WK', 'DL'],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'UPTREND',
      last_opened_at: '2024-01-01T00:00:00Z',
      is_fno: false,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TickerManager
    mockTickerManager = {
      getTicker: jest.fn().mockResolvedValue(createMockTicker()),
      updateTicker: jest.fn(),
      markRecent: jest.fn(),
      listTickers: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    // Mock DomManager
    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('AAPL'),
      getCurrentExchange: jest.fn(),
      getName: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      getTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    timeFrameManager = new TimeFrameManager(mockTickerManager, mockDomManager);
  });

  describe('Constructor', () => {
    it('should create instance with ticker and dom dependencies', () => {
      expect(timeFrameManager).toBeInstanceOf(TimeFrameManager);
    });
  });

  describe('getAllowedTimeframesForCurrentTicker', () => {
    it('should read current ticker from DOM and fetch backend timeframes', async () => {
      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(['TMN', 'MN', 'WK', 'DL']);
    });

    it('should normalize backend timeframes to canonical order', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['WK', 'MN', 'DL', 'TMN', 'SMN'] })
      );

      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      expect(result).toEqual(['SMN', 'TMN', 'MN', 'WK', 'DL']);
    });

    it('should deduplicate repeated timeframe codes', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['TMN', 'WK', 'TMN', 'WK', 'DL'] })
      );

      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      expect(result).toEqual(['TMN', 'WK', 'DL']);
    });

    it('should fall back to default timeframes when backend read fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to default timeframes')
      );
      expect(result).toEqual(['TMN', 'MN', 'WK', 'DL']);
    });

    it('should silently drop unsupported codes like YR', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );

      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      expect(result).toEqual(['SMN', 'TMN', 'MN', 'WK']);
    });
  });

  describe('getTimeFrameConfigByCode', () => {
    it('should return config for known code', () => {
      const config = timeFrameManager.getTimeFrameConfigByCode('DL');
      expect(config).not.toBeNull();
      expect(config!.symbol).toBe('DL');
      expect(config!.toolbar).toBe(2);
    });

    it('should return null for unknown code', () => {
      const config = timeFrameManager.getTimeFrameConfigByCode('UNKNOWN');
      expect(config).toBeNull();
    });
  });

  describe('applyTimeFrame', () => {
    it('should apply allowed timeframe at position 0', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(true);
      // Position 0 in default timeframes ['TMN','MN','WK','DL'] → TMN → toolbar 5
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(5)`);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should apply allowed timeframe at position 1', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(1);

      expect(result).toBe(true);
      // Position 1 → MN → toolbar 4
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(4)`);
    });

    it('should apply allowed timeframe at position 2', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(2);

      expect(result).toBe(true);
      // Position 2 → WK → toolbar 3
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
    });

    it('should apply allowed timeframe at position 3', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(3);

      expect(result).toBe(true);
      // Position 3 → DL → toolbar 2
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(2)`);
    });

    it('should use backend timeframes when available', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['SMN', 'TMN', 'MN', 'WK'] })
      );
      mockJQuery.mockReturnValue({ length: 1, click: jest.fn() });

      // Flush cache — applyTimeFrame will re-fetch
      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(true);
      // Position 0 in ['SMN','TMN','MN','WK'] → SMN → toolbar 6
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });

    it('should return false when toolbar element not found', async () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(false);
    });

    it('should return false when position is outside allowed timeframes', async () => {
      // Default allows 4 timeframes, position 4 is out of bounds
      const result = await timeFrameManager.applyTimeFrame(4);

      expect(result).toBe(false);
    });

    it('should return false for negative position', async () => {
      const result = await timeFrameManager.applyTimeFrame(-1);
      expect(result).toBe(false);
    });
  });

  describe('getCurrentTimeFrameConfig', () => {
    it('should return correct config when active button found', () => {
      // Mock the jQuery chain for active button detection
      const mockIndex = jest.fn().mockReturnValue(2);
      mockJQuery
        .mockReturnValueOnce({ length: 1 }) // Active button found
        .mockReturnValueOnce({ index: mockIndex }); // Index query

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.HEADER.TIMEFRAME);
      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['DL']);
      expect(result.symbol).toBe('DL');
    });

    it('should return WEEKLY config for toolbar index 3', () => {
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['WK']);
    });

    it('should return MONTHLY config for toolbar index 4', () => {
      const mockIndex = jest.fn().mockReturnValue(4);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
    });

    it('should return THREE_MONTHLY config for toolbar index 5', () => {
      const mockIndex = jest.fn().mockReturnValue(5);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['TMN']);
    });

    it('should return SIX_MONTHLY config for toolbar index 6', () => {
      const mockIndex = jest.fn().mockReturnValue(6);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['SMN']);
    });

    it('should fallback to MONTHLY when no active button found', () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
    });

    it('should fallback to MONTHLY when invalid toolbar index', () => {
      const mockIndex = jest.fn().mockReturnValue(999);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
    });

    it('should fallback to MONTHLY when negative toolbar index', () => {
      const mockIndex = jest.fn().mockReturnValue(-1);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
    });

    it('should handle edge case toolbar indices', () => {
      const edgeCases = [0, 1, 7, 99];

      edgeCases.forEach((index) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();

        expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
      });
    });

    it('should handle all valid toolbar index mappings', () => {
      const validMappings = [
        { index: 2, expected: 'DL' },
        { index: 3, expected: 'WK' },
        { index: 4, expected: 'MN' },
        { index: 5, expected: 'TMN' },
        { index: 6, expected: 'SMN' },
      ];

      validMappings.forEach(({ index, expected }) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(Constants.TIME.FRAMES_BY_CODE[expected]);
      });
    });

    it('should handle invalid toolbar index fallbacks', () => {
      const invalidIndices = [0, 1, 7, 999, -1, -999];

      invalidIndices.forEach((index) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete timeframe application workflow', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(2);

      expect(result).toBe(true);
      // Position 2 in default ['TMN','MN','WK','DL'] → WK → toolbar 3
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle timeframe detection workflow', () => {
      const mockIndex = jest.fn().mockReturnValue(4);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.HEADER.TIMEFRAME);
      expect(result).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
      expect(result.symbol).toBe('MN');
      expect(result.toolbar).toBe(4);
    });

    it('should maintain consistency between apply and get operations', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      await timeFrameManager.applyTimeFrame(2);

      // Simulate that timeframe was applied (toolbar index 3 = WK)
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const currentConfig = timeFrameManager.getCurrentTimeFrameConfig();

      expect(currentConfig).toBe(Constants.TIME.FRAMES_BY_CODE['WK']);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test backend fallback
      mockTickerManager.getTicker.mockRejectedValue(new Error('Network error'));
      mockJQuery.mockReturnValue({ length: 1, click: jest.fn() });

      const result = await timeFrameManager.applyTimeFrame(0);
      expect(result).toBe(true);

      // Test DOM detection failure
      mockJQuery.mockReturnValue({ length: 0 });

      const currentConfig = timeFrameManager.getCurrentTimeFrameConfig();
      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(currentConfig).toBe(Constants.TIME.FRAMES_BY_CODE['MN']);
    });

    it('should handle DOM element detection edge cases', async () => {
      // Test when jQuery selector returns empty set
      mockJQuery.mockReturnValue({ length: 0 });

      const result1 = await timeFrameManager.applyTimeFrame(0);
      expect(result1).toBe(false);

      // Test when DOM element exists but click fails
      const mockClick = jest.fn().mockImplementation(() => {
        throw new Error('Click failed');
      });
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      await expect(timeFrameManager.applyTimeFrame(0)).rejects.toThrow('Click failed');
    });

    it('should verify all configured timeframe codes have valid configs', () => {
      const validCodes = ['DL', 'WK', 'MN', 'TMN', 'SMN'];

      validCodes.forEach((code) => {
        const config = Constants.TIME.FRAMES_BY_CODE[code];
        expect(config).toBeDefined();
        expect(config.symbol).toBeTruthy();
        expect(config.toolbar).toBeGreaterThan(0);
        expect(config.style).toBeTruthy();

        // Test that we can detect each timeframe
        const mockIndex = jest.fn().mockReturnValue(config.toolbar);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(config);
      });
    });

    it('should verify normalize + apply consistency with backend timeframes', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['WK', 'MN', 'DL', 'TMN', 'SMN'] })
      );
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // First position should be highest = SMN → toolbar 6
      await timeFrameManager.applyTimeFrame(0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });
  });
});
