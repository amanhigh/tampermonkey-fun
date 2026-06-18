import { TimeFrameManager, ITimeFrameManager } from '../../src/manager/timeframe';
import { ITickerManager } from '../../src/manager/ticker';
import { IDomManager } from '../../src/manager/dom';
import { IPublisher } from '../../src/manager/event_bus';
import { Ticker, TickerType, TickerState, TickerTrend } from '../../src/models/ticker';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';
import { Sequence, TickerTimeframe, TMN_SEQUENCE, SMN_SEQUENCE } from '../../src/models/timeframe';
import { DomainEventType } from '../../src/models/domain_event';

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
  let mockPublisher: jest.Mocked<IPublisher>;

  const createMockTicker = (overrides: Partial<Ticker> = {}): Ticker =>
    new Ticker({
      ticker: 'TEST',
      exchange: 'NSE',
      timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL],
      type: TickerType.EQUITY,
      state: TickerState.WATCHED,
      trend: TickerTrend.UPTREND,
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

    mockPublisher = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<IPublisher>;

    timeFrameManager = new TimeFrameManager(mockTickerManager, mockDomManager, mockPublisher);
  });

  describe('Constructor', () => {
    it('should create instance with ticker, dom and publisher dependencies', () => {
      expect(timeFrameManager).toBeInstanceOf(TimeFrameManager);
    });
  });

  // ── Active Timeframes ──

  describe('getActiveTimeframes', () => {
    it('should preserve active backend timeframes including YR', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] })
      );

      const result = await timeFrameManager.getActiveTimeframes();

      expect(result).toEqual([        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);
    });

    it('should sort active backend timeframes in canonical order including YR', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.WK, TickerTimeframe.YR, TickerTimeframe.MN, TickerTimeframe.SMN, TickerTimeframe.DL, TickerTimeframe.TMN] })
      );

      const result = await timeFrameManager.getActiveTimeframes();

      // Canonical with YR: YR, SMN, TMN, MN, WK, DL
      expect(result).toEqual([        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL]);
    });

    it('should fall back to default timeframes when backend read fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await timeFrameManager.getActiveTimeframes();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to default timeframes')
      );
      expect(result).toEqual([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL]);
    });
  });

  // ── Sequence (4-tuple, YR dropped) ──

  describe('getSequence', () => {
    it('should return TMN, MN, WK, DL for MWD backend list', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL] })
      );

      const result = await timeFrameManager.getSequence();

      expect(result).toEqual([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL] as Sequence);
    });

    it('should return SMN, TMN, MN, WK for YR, SMN, TMN, MN, WK backend list (no DL)', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] })
      );

      const result = await timeFrameManager.getSequence();

      // No DL → SMN_SEQUENCE
      expect(result).toEqual(SMN_SEQUENCE);
    });

    it('should return TMN_SEQUENCE when backend list contains DL at any position', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.WK, TickerTimeframe.DL] })
      );

      const result = await timeFrameManager.getSequence();

      // Contains DL → TMN_SEQUENCE
      expect(result).toEqual(TMN_SEQUENCE);
    });

    it('should fall back to TMN_SEQUENCE when backend read fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await timeFrameManager.getSequence();

      expect(result).toEqual(TMN_SEQUENCE);
    });
  });

  // ── Toggle Timeframe ──

  describe('toggleTimeframe', () => {
    it('should add an inactive timeframe and persist sorted list', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] }) // DL is missing
      );

      const result = await timeFrameManager.toggleTimeframe(TickerTimeframe.DL);

      // DL should be added and sorted in display order
      expect(result).toEqual([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL]);
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('AAPL', {
      timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL],
      });
    });

    it('should remove an active timeframe and persist sorted list', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL] })
      );

      const result = await timeFrameManager.toggleTimeframe(TickerTimeframe.WK);

      expect(result).toEqual([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.DL]);
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('AAPL', {
        timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.DL],
      });
    });

    it('should preserve YR when toggling another timeframe', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.WK] }) // MN missing
      );

      const result = await timeFrameManager.toggleTimeframe(TickerTimeframe.MN);

      // YR should still be present, MN added in sorted order
      expect(result).toEqual([        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);
      expect(mockTickerManager.updateTicker).toHaveBeenCalledWith('AAPL', {
        timeframes: [        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK],
      });
    });

    it('should publish TICKER_TIMEFRAMES_CHANGED after successful update', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] }) // DL is missing
      );

      await timeFrameManager.toggleTimeframe(TickerTimeframe.DL);

      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TIMEFRAMES_CHANGED,
        ticker: 'AAPL',
      });
    });

    it('should not publish when backend update fails', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL] })
      );
      mockTickerManager.updateTicker.mockRejectedValue(new Error('Backend timeout'));

      await expect(timeFrameManager.toggleTimeframe(TickerTimeframe.DL)).rejects.toThrow(
        'Backend timeout'
      );

      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });

  // ── Apply TimeFrame (uses Sequence) ──

  describe('apply', () => {
    it('should apply sequence position 0', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.apply(0);

      expect(result).toBe(true);
      // Position 0 in ['TMN','MN','WK','DL'] → TMN → toolbar 5
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(5)`);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should apply sequence position 1', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.apply(1);

      expect(result).toBe(true);
      // Position 1 → MN → toolbar 4
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(4)`);
    });

    it('should apply sequence position 2', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.apply(2);

      expect(result).toBe(true);
      // Position 2 → WK → toolbar 3
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
    });

    it('should apply sequence position 3', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.apply(3);

      expect(result).toBe(true);
      // Position 3 → DL → toolbar 2
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(2)`);
    });

    it('should use SMN_SEQUENCE when backend list has no DL', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] })
      );
      mockJQuery.mockReturnValue({ length: 1, click: jest.fn() });

      const result = await timeFrameManager.apply(0);

      expect(result).toBe(true);
      // No DL → SMN_SEQUENCE ['SMN','TMN','MN','WK'] → position 0 → SMN → toolbar 6
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });

    it('should return false when toolbar element not found', async () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = await timeFrameManager.apply(0);

      expect(result).toBe(false);
    });

    it('should return false for position 4 (beyond Sequence size)', async () => {
      // Sequence always has 4 frames, position 4 should fail
      const result = await timeFrameManager.apply(4);

      expect(result).toBe(false);
    });

    it('should return false for negative position', async () => {
      const result = await timeFrameManager.apply(-1);
      expect(result).toBe(false);
    });
  });

  // ── Current TimeFrame Config ──

  describe('getCurrentConfig', () => {
    it('should return correct config when active button found', () => {
      const mockIndex = jest.fn().mockReturnValue(2);
      mockJQuery
        .mockReturnValueOnce({ length: 1 }) // Active button found
        .mockReturnValueOnce({ index: mockIndex }); // Index query

      const result = timeFrameManager.getCurrentConfig();

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);
      expect(result.code).toBe(TickerTimeframe.DL);
      expect(result.toolbar).toBe(2);
    });

    it('should return WEEKLY config for toolbar index 3', () => {
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentConfig();

      expect(result.code).toBe(TickerTimeframe.WK);
    });

    it('should return MONTHLY config for toolbar index 4', () => {
      const mockIndex = jest.fn().mockReturnValue(4);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentConfig();

      expect(result.code).toBe(TickerTimeframe.MN);
    });

    it('should return THREE_MONTHLY config for toolbar index 5', () => {
      const mockIndex = jest.fn().mockReturnValue(5);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentConfig();

      expect(result.code).toBe(TickerTimeframe.TMN);
    });

    it('should return SIX_MONTHLY config for toolbar index 6', () => {
      const mockIndex = jest.fn().mockReturnValue(6);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentConfig();

      expect(result.code).toBe(TickerTimeframe.SMN);
    });

    it('should fallback to MONTHLY when no active button found', () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = timeFrameManager.getCurrentConfig();

      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(result.code).toBe(TickerTimeframe.MN);
    });

    it('should fallback to MONTHLY when invalid toolbar index', () => {
      const mockIndex = jest.fn().mockReturnValue(999);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentConfig();

      expect(result.code).toBe(TickerTimeframe.MN);
    });

    it('should handle all valid toolbar index mappings', () => {
      const validMappings = [
        { index: 2, expected: TickerTimeframe.DL },
        { index: 3, expected: TickerTimeframe.WK },
        { index: 4, expected: TickerTimeframe.MN },
        { index: 5, expected: TickerTimeframe.TMN },
        { index: 6, expected: TickerTimeframe.SMN },
      ];

      validMappings.forEach(({ index, expected }) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentConfig();
        expect(result.code).toBe(expected);
      });
    });
  });

  // ── Integration Tests ──

  describe('Integration Tests', () => {
    it('should handle complete timeframe application workflow', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const result = await timeFrameManager.apply(2);

      expect(result).toBe(true);
      // Position 2 in default ['TMN','MN','WK','DL'] → WK → toolbar 3
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle error scenarios gracefully', async () => {
      // Test backend fallback for apply
      mockTickerManager.getTicker.mockRejectedValue(new Error('Network error'));
      mockJQuery.mockReturnValue({ length: 1, click: jest.fn() });

      const result = await timeFrameManager.apply(0);
      expect(result).toBe(true);

      // Test DOM detection failure
      mockJQuery.mockReturnValue({ length: 0 });

      const currentConfig = timeFrameManager.getCurrentConfig();
      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(currentConfig.code).toBe(TickerTimeframe.MN);
    });

    it('should maintain consistency between apply and get operations', async () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      await timeFrameManager.apply(2);

      // Simulate that timeframe was applied (toolbar index 3 = WK)
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const currentConfig = timeFrameManager.getCurrentConfig();

      expect(currentConfig.code).toBe(TickerTimeframe.WK);
    });

    it('should return correct config for each timeframe code by toolbar index', () => {
      // Inline expected timeframe configs matching the manager's TIMEFRAMES array
      const expectedConfigs: Record<string, { toolbar: number; style: string }> = {
        [TickerTimeframe.DL]: { toolbar: 2, style: 'I' },
        [TickerTimeframe.WK]: { toolbar: 3, style: 'H' },
        [TickerTimeframe.MN]: { toolbar: 4, style: 'VH' },
        [TickerTimeframe.TMN]: { toolbar: 5, style: 'T' },
        [TickerTimeframe.SMN]: { toolbar: 6, style: 'I' },
      };

      Object.entries(expectedConfigs).forEach(([code, expected]) => {
        // Mock toolbar index matching expected.toolbar
        const mockIndex = jest.fn().mockReturnValue(expected.toolbar);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentConfig();
        expect(result.code).toBe(code);
        expect(result.toolbar).toBe(expected.toolbar);
        expect(result.style).toBe(expected.style);
      });
    });

    it('should verify active vs Sequence consistency with YR backend timeframes (no DL)', async () => {
      mockTickerManager.getTicker.mockResolvedValue(
        createMockTicker({ timeframes: [        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK] })
      );
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // Active includes YR
      const active = await timeFrameManager.getActiveTimeframes();
      expect(active).toEqual([        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);

      // No DL → SMN_SEQUENCE
      const sequence = await timeFrameManager.getSequence();
      expect(sequence).toEqual(SMN_SEQUENCE);

      // Position 0 in SMN_SEQUENCE = SMN → toolbar 6
      await timeFrameManager.apply(0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
    });
  });
});
