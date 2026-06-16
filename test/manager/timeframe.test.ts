import { TimeFrameManager, ITimeFrameManager } from '../../src/manager/timeframe';
import { ITickerManager } from '../../src/manager/ticker';
import { IDomManager } from '../../src/manager/dom';
import { Ticker } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';
import { AppliedTimeframeTuple } from '../../src/models/trading';

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

  // ── Exact Timeframes (includes YR) ──

  describe('getExactTimeframesForCurrentTicker', () => {
    it('should preserve exact backend timeframes including YR', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );

      const result = await timeFrameManager.getExactTimeframesForCurrentTicker();

      expect(result).toEqual(['YR', 'SMN', 'TMN', 'MN', 'WK']);
    });

    it('should sort exact backend timeframes in canonical order including YR', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['WK', 'YR', 'MN', 'SMN', 'DL', 'TMN'] })
      );

      const result = await timeFrameManager.getExactTimeframesForCurrentTicker();

      // Canonical with YR: YR, SMN, TMN, MN, WK, DL
      expect(result).toEqual(['YR', 'SMN', 'TMN', 'MN', 'WK', 'DL']);
    });

    it('should fall back to default timeframes when backend read fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await timeFrameManager.getExactTimeframesForCurrentTicker();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to default timeframes')
      );
      expect(result).toEqual(['TMN', 'MN', 'WK', 'DL']);
    });
  });

  // ── getAllowedTimeframesForCurrentTicker (alias) ──

  describe('getAllowedTimeframesForCurrentTicker', () => {
    it('should delegate to getExactTimeframesForCurrentTicker', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );

      const result = await timeFrameManager.getAllowedTimeframesForCurrentTicker();

      // Should include YR since it delegates to exact
      expect(result).toEqual(['YR', 'SMN', 'TMN', 'MN', 'WK']);
    });
  });

  // ── Applied Timeframes (4-tuple, YR dropped) ──

  describe('getAppliedTimeframesForCurrentTicker', () => {
    it('should return TMN, MN, WK, DL for MWD backend list', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['TMN', 'MN', 'WK', 'DL'] })
      );

      const result = await timeFrameManager.getAppliedTimeframesForCurrentTicker();

      expect(result).toEqual(['TMN', 'MN', 'WK', 'DL'] as AppliedTimeframeTuple);
    });

    it('should return SMN, TMN, MN, WK for YR, SMN, TMN, MN, WK backend list', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );

      const result = await timeFrameManager.getAppliedTimeframesForCurrentTicker();

      // YR should be dropped, top 4 become SMN, TMN, MN, WK
      expect(result).toEqual(['SMN', 'TMN', 'MN', 'WK'] as AppliedTimeframeTuple);
    });

    it('should always return exactly 4 frames', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['TMN', 'DL'] })
      );

      const result = await timeFrameManager.getAppliedTimeframesForCurrentTicker();

      // Padded with missing lower frames
      expect(result).toHaveLength(4);
      expect(result[0]).toBe('TMN');
      expect(result[3]).toBe('DL');
    });

    it('should fall back to default applied tuple when backend read fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await timeFrameManager.getAppliedTimeframesForCurrentTicker();

      expect(result).toEqual(['TMN', 'MN', 'WK', 'DL'] as AppliedTimeframeTuple);
    });
  });

  // ── TimeFrameConfig ──

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

  // ── Apply TimeFrame (uses applied tuple) ──

  describe('applyTimeFrame', () => {
    it('should apply applied tuple position 0', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(true);
      // Position 0 in ['TMN','MN','WK','DL'] → TMN → toolbar 5
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(5)`);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should apply applied tuple position 1', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(1);

      expect(result).toBe(true);
      // Position 1 → MN → toolbar 4
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(4)`);
    });

    it('should apply applied tuple position 2', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(2);

      expect(result).toBe(true);
      // Position 2 → WK → toolbar 3
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
    });

    it('should apply applied tuple position 3', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.applyTimeFrame(3);

      expect(result).toBe(true);
      // Position 3 → DL → toolbar 2
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(2)`);
    });

    it('should use backend applied tuple when YR backend list is provided', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );
      mockJQuery.mockReturnValue({ length: 1, click: jest.fn() });

      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(true);
      // Position 0 in applied tuple ['SMN','TMN','MN','WK'] → SMN → toolbar 6
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });

    it('should return false when toolbar element not found', async () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = await timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(false);
    });

    it('should return false for position 4 (beyond applied tuple size)', async () => {
      // Applied tuple always has 4 frames, position 4 should fail
      const result = await timeFrameManager.applyTimeFrame(4);

      expect(result).toBe(false);
    });

    it('should return false for negative position', async () => {
      const result = await timeFrameManager.applyTimeFrame(-1);
      expect(result).toBe(false);
    });
  });

  // ── Current TimeFrame Config ──

  describe('getCurrentTimeFrameConfig', () => {
    it('should return correct config when active button found', () => {
      const mockIndex = jest.fn().mockReturnValue(2);
      mockJQuery
        .mockReturnValueOnce({ length: 1 }) // Active button found
        .mockReturnValueOnce({ index: mockIndex }); // Index query

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);
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
  });

  // ── Integration Tests ──

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

    it('should handle error scenarios gracefully', async () => {
      // Test backend fallback for apply
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

    it('should verify exact vs applied consistency with YR backend timeframes', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] })
      );
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // Exact includes YR
      const exact = await timeFrameManager.getExactTimeframesForCurrentTicker();
      expect(exact).toEqual(['YR', 'SMN', 'TMN', 'MN', 'WK']);

      // Applied drops YR and uses SMN as top
      const applied = await timeFrameManager.getAppliedTimeframesForCurrentTicker();
      expect(applied).toEqual(['SMN', 'TMN', 'MN', 'WK'] as AppliedTimeframeTuple);

      // Position 0 in applied tuple = SMN → toolbar 6
      await timeFrameManager.applyTimeFrame(0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });
  });
});
