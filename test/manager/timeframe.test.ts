import { TimeFrameManager, ITimeFrameManager } from '../../src/manager/timeframe';
import { ISequenceManager } from '../../src/manager/sequence';
import { SequenceType, TimeFrame, TimeFrameConfig } from '../../src/models/trading';
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
  let mockSequenceManager: jest.Mocked<ISequenceManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SequenceManager
    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockReturnValue(SequenceType.MWD),
      flipSequence: jest.fn(),
      sequenceToTimeFrameConfig: jest.fn().mockReturnValue(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.DAILY]),
      toggleFreezeSequence: jest.fn(),
    } as unknown as jest.Mocked<ISequenceManager>;

    timeFrameManager = new TimeFrameManager(mockSequenceManager);
  });

  describe('Constructor', () => {
    it('should create instance with sequence manager dependency', () => {
      expect(timeFrameManager).toBeInstanceOf(TimeFrameManager);
    });
  });

  describe('applyTimeFrame', () => {
    it('should apply timeframe successfully for position 0', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(
        new TimeFrameConfig('TMN', 'three-monthly-style', 5)
      );

      const result = timeFrameManager.applyTimeFrame(0);

      expect(mockSequenceManager.getCurrentSequence).toHaveBeenCalled();
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.MWD, 0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(5)`);
      expect(mockClick).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should apply timeframe successfully for position 1', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(new TimeFrameConfig('MN', 'monthly-style', 4));

      const result = timeFrameManager.applyTimeFrame(1);

      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.MWD, 1);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(4)`);
      expect(result).toBe(true);
    });

    it('should apply timeframe successfully for position 2', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(new TimeFrameConfig('WK', 'weekly-style', 3));

      const result = timeFrameManager.applyTimeFrame(2);

      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.MWD, 2);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
      expect(result).toBe(true);
    });

    it('should apply timeframe successfully for position 3', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(new TimeFrameConfig('D', 'daily-style', 2));

      const result = timeFrameManager.applyTimeFrame(3);

      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.MWD, 3);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(2)`);
      expect(result).toBe(true);
    });

    it('should handle YR sequence correctly', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(new TimeFrameConfig('SMN', 'six-monthly-style', 6));

      const result = timeFrameManager.applyTimeFrame(0);

      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.YR, 0);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(6)`);
      expect(result).toBe(true);
    });

    it('should return false when timeframe element not found', () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = timeFrameManager.applyTimeFrame(0);

      expect(result).toBe(false);
    });

    it('should propagate sequence manager errors', () => {
      mockSequenceManager.sequenceToTimeFrameConfig.mockImplementation(() => {
        throw new Error('Invalid position');
      });

      expect(() => timeFrameManager.applyTimeFrame(999)).toThrow('Invalid position');
    });

    it('should handle different toolbar positions', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      const testCases = [
        { timeFrame: TimeFrame.DAILY, toolbarIndex: 2 },
        { timeFrame: TimeFrame.WEEKLY, toolbarIndex: 3 },
        { timeFrame: TimeFrame.MONTHLY, toolbarIndex: 4 },
        { timeFrame: TimeFrame.THREE_MONTHLY, toolbarIndex: 5 },
        { timeFrame: TimeFrame.SIX_MONTHLY, toolbarIndex: 6 },
      ];

      testCases.forEach(({ timeFrame, toolbarIndex }) => {
        mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(Constants.TIME.SEQUENCE_TYPES.FRAMES[timeFrame]);

        timeFrameManager.applyTimeFrame(0);

        expect(mockJQuery).toHaveBeenLastCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(${toolbarIndex})`);
      });
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
      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.DAILY]);
    });

    it('should return WEEKLY config for toolbar index 3', () => {
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY]);
    });

    it('should return MONTHLY config for toolbar index 4', () => {
      const mockIndex = jest.fn().mockReturnValue(4);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
    });

    it('should return THREE_MONTHLY config for toolbar index 5', () => {
      const mockIndex = jest.fn().mockReturnValue(5);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.THREE_MONTHLY]);
    });

    it('should return SIX_MONTHLY config for toolbar index 6', () => {
      const mockIndex = jest.fn().mockReturnValue(6);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.SIX_MONTHLY]);
    });

    it('should fallback to MONTHLY when no active button found', () => {
      mockJQuery.mockReturnValue({ length: 0 });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
    });

    it('should fallback to MONTHLY when invalid toolbar index', () => {
      const mockIndex = jest.fn().mockReturnValue(999);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
    });

    it('should fallback to MONTHLY when negative toolbar index', () => {
      const mockIndex = jest.fn().mockReturnValue(-1);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
    });

    it('should handle edge case toolbar indices', () => {
      const edgeCases = [0, 1, 7, 99];

      edgeCases.forEach((index) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();

        expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete timeframe application workflow', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(
        Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY]
      );

      const result = timeFrameManager.applyTimeFrame(2);

      expect(mockSequenceManager.getCurrentSequence).toHaveBeenCalled();
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenCalledWith(SequenceType.MWD, 2);
      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}:nth(3)`);
      expect(mockClick).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle timeframe detection workflow', () => {
      const mockIndex = jest.fn().mockReturnValue(4);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const result = timeFrameManager.getCurrentTimeFrameConfig();

      expect(mockJQuery).toHaveBeenCalledWith(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.HEADER.TIMEFRAME);
      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
      expect(result.symbol).toBe('MN');
      expect(result.toolbar).toBe(4);
    });

    it('should handle sequence switching scenarios', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // Test MWD sequence
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(
        Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.DAILY]
      );

      let result = timeFrameManager.applyTimeFrame(3);
      expect(result).toBe(true);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenLastCalledWith(SequenceType.MWD, 3);

      // Test YR sequence
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(
        Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.SIX_MONTHLY]
      );

      result = timeFrameManager.applyTimeFrame(0);
      expect(result).toBe(true);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenLastCalledWith(SequenceType.YR, 0);
    });

    it('should maintain consistency between apply and get operations', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // Apply a timeframe
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(
        Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY]
      );

      timeFrameManager.applyTimeFrame(2);

      // Simulate that timeframe was applied (toolbar index 3)
      const mockIndex = jest.fn().mockReturnValue(3);
      mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

      const currentConfig = timeFrameManager.getCurrentTimeFrameConfig();

      // Should return the same timeframe
      expect(currentConfig).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY]);
    });

    it('should handle error scenarios gracefully', () => {
      // Test sequence manager error propagation
      mockSequenceManager.sequenceToTimeFrameConfig.mockImplementation(() => {
        throw new Error('Test sequence error');
      });

      expect(() => timeFrameManager.applyTimeFrame(0)).toThrow('Test sequence error');

      // Test DOM detection failure
      mockJQuery.mockReturnValue({ length: 0 });

      const result = timeFrameManager.getCurrentTimeFrameConfig();
      expect(Notifier.warn).toHaveBeenCalledWith('Timeframe Detection Failed - Using Monthly as Fallback');
      expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
    });

    it('should verify all timeframe configurations are valid', () => {
      const allTimeFrames = Object.values(TimeFrame);
      const allConfigs = allTimeFrames.map((tf) => Constants.TIME.SEQUENCE_TYPES.FRAMES[tf]);

      // Verify all configurations are valid
      allConfigs.forEach((config) => {
        expect(config).toBeDefined();
        expect(config.symbol).toBeTruthy();
        expect(config.toolbar).toBeGreaterThan(0);
        expect(config.style).toBeTruthy();
      });

      // Test that we can detect each timeframe
      allConfigs.forEach((config) => {
        const mockIndex = jest.fn().mockReturnValue(config.toolbar);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(config);
      });
    });

    it('should verify timeframe sequence mappings consistency', () => {
      const mockClick = jest.fn();
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      // Test MWD sequence positions map to correct timeframes
      const mwdSequence = Constants.TIME.SEQUENCE_TYPES.SEQUENCES[SequenceType.MWD];
      mwdSequence.forEach((timeFrame, position) => {
        mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
        mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(Constants.TIME.SEQUENCE_TYPES.FRAMES[timeFrame]);

        timeFrameManager.applyTimeFrame(position);

        expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenLastCalledWith(SequenceType.MWD, position);
      });

      // Test YR sequence positions map to correct timeframes
      const yrSequence = Constants.TIME.SEQUENCE_TYPES.SEQUENCES[SequenceType.YR];
      yrSequence.forEach((timeFrame, position) => {
        mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
        mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(Constants.TIME.SEQUENCE_TYPES.FRAMES[timeFrame]);

        timeFrameManager.applyTimeFrame(position);

        expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenLastCalledWith(SequenceType.YR, position);
      });
    });

    it('should handle DOM element detection edge cases', () => {
      // Test when jQuery selector returns empty set
      mockJQuery.mockReturnValue({ length: 0 });

      const result1 = timeFrameManager.applyTimeFrame(0);
      expect(result1).toBe(false);

      // Test when DOM element exists but click fails
      const mockClick = jest.fn().mockImplementation(() => {
        throw new Error('Click failed');
      });
      mockJQuery.mockReturnValue({ length: 1, click: mockClick });

      expect(() => timeFrameManager.applyTimeFrame(0)).toThrow('Click failed');
    });

    it('should handle all valid toolbar index mappings', () => {
      const validMappings = [
        { index: 2, expected: TimeFrame.DAILY },
        { index: 3, expected: TimeFrame.WEEKLY },
        { index: 4, expected: TimeFrame.MONTHLY },
        { index: 5, expected: TimeFrame.THREE_MONTHLY },
        { index: 6, expected: TimeFrame.SIX_MONTHLY },
      ];

      validMappings.forEach(({ index, expected }) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[expected]);
      });
    });

    it('should handle invalid toolbar index fallbacks', () => {
      const invalidIndices = [0, 1, 7, 999, -1, -999];

      invalidIndices.forEach((index) => {
        const mockIndex = jest.fn().mockReturnValue(index);
        mockJQuery.mockReturnValueOnce({ length: 1 }).mockReturnValueOnce({ index: mockIndex });

        const result = timeFrameManager.getCurrentTimeFrameConfig();
        expect(result).toBe(Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY]);
      });
    });
  });
});
