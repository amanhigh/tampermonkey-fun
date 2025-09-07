import { JournalManager, IJournalManager } from '../../src/manager/journal';
import { ISequenceManager } from '../../src/manager/sequence';
import { IKohanClient } from '../../src/client/kohan';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { JournalType, SequenceType } from '../../src/models/trading';
import { TimeFrameConfig } from '../../src/models/trading';
import { Notifier } from '../../src/util/notify';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

describe('JournalManager', () => {
  let journalManager: IJournalManager;
  let mockSequenceManager: jest.Mocked<ISequenceManager>;
  let mockKohanClient: jest.Mocked<IKohanClient>;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  const mockTimeFrameConfig = new TimeFrameConfig('D', 'daily-style', 1);

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SequenceManager
    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockReturnValue(SequenceType.MWD),
      flipSequence: jest.fn(),
      sequenceToTimeFrameConfig: jest.fn(),
      getSequence: jest.fn(),
      applySequence: jest.fn(),
      setSequence: jest.fn(),
      freezeSequence: jest.fn(),
      thawSequence: jest.fn(),
      isFrozen: jest.fn(),
    } as unknown as jest.Mocked<ISequenceManager>;

    // Mock KohanClient
    mockKohanClient = {
      recordTicker: jest.fn().mockResolvedValue(undefined),
      getClip: jest.fn().mockResolvedValue('clipboard-data'),
      enableSubmap: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IKohanClient>;

    // Mock TimeFrameManager
    mockTimeFrameManager = {
      applyTimeFrame: jest.fn().mockReturnValue(true),
      getCurrentTimeFrameConfig: jest.fn().mockReturnValue(mockTimeFrameConfig),
    } as unknown as jest.Mocked<ITimeFrameManager>;

    journalManager = new JournalManager(mockSequenceManager, mockKohanClient, mockTimeFrameManager);
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(journalManager).toBeInstanceOf(JournalManager);
    });

    it('should initialize with correct dependency interfaces', () => {
      const manager = new JournalManager(mockSequenceManager, mockKohanClient, mockTimeFrameManager);
      expect(manager).toBeDefined();
    });
  });

  describe('createEntry', () => {
    const testTicker = 'AAPL';
    const testReason = 'breakout';

    it('should create journal entry with SET type', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      await journalManager.createEntry(testTicker, JournalType.SET, testReason);

      const expectedTag = `${testTicker}.yr.${JournalType.SET}.${testReason}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should create journal entry with RESULT type', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry(testTicker, JournalType.RESULT, testReason);

      const expectedTag = `${testTicker}.mwd.${JournalType.RESULT}.${testReason}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should create journal entry with REJECTED type', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry(testTicker, JournalType.REJECTED, testReason);

      const expectedTag = `${testTicker}.mwd.${JournalType.REJECTED}.${testReason}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should handle empty reason string by excluding it from tag', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry(testTicker, JournalType.SET, '');

      const expectedTag = `${testTicker}.mwd.${JournalType.SET}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should handle "Cancel" reason by excluding it from tag', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      await journalManager.createEntry(testTicker, JournalType.RESULT, 'Cancel');

      const expectedTag = `${testTicker}.yr.${JournalType.RESULT}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should handle undefined reason by excluding it from tag', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry(testTicker, JournalType.REJECTED, undefined as any);

      const expectedTag = `${testTicker}.mwd.${JournalType.REJECTED}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should lowercase sequence type in tag', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      await journalManager.createEntry('GOOGL', JournalType.SET, 'momentum');

      const expectedTag = 'GOOGL.yr.set.momentum';
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
    });

    it('should handle special characters in ticker symbol', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry('BRK-B', JournalType.RESULT, 'test');

      const expectedTag = 'BRK-B.mwd.result.test';
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
    });

    it('should handle special characters in reason', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry('AAPL', JournalType.SET, 'test-reason_1');

      const expectedTag = 'AAPL.mwd.set.test-reason_1';
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
    });

    it('should propagate client errors', async () => {
      const clientError = new Error('Client connection failed');
      mockKohanClient.recordTicker.mockRejectedValue(clientError);

      await expect(journalManager.createEntry(testTicker, JournalType.SET, testReason)).rejects.toThrow(
        'Client connection failed'
      );

      expect(Notifier.success).not.toHaveBeenCalled();
    });

    it('should handle very long ticker names', async () => {
      const longTicker = 'A'.repeat(50);
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry(longTicker, JournalType.SET, 'reason');

      const expectedTag = `${longTicker}.mwd.set.reason`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
    });

    it('should handle very long reason codes', async () => {
      const longReason = 'reason'.repeat(20);
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      await journalManager.createEntry(testTicker, JournalType.RESULT, longReason);

      const expectedTag = `${testTicker}.yr.result.${longReason}`;
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);
    });
  });

  describe('createReasonText', () => {
    it('should create formatted reason text with current timeframe', () => {
      const testReason = 'breakout';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('D - breakout');
      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalled();
    });

    it('should handle empty reason', () => {
      const result = journalManager.createReasonText('');

      expect(result).toBe('D - ');
    });

    it('should handle reason with special characters', () => {
      const testReason = 'test-reason_123';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('D - test-reason_123');
    });

    it('should handle reason with spaces', () => {
      const testReason = 'volume breakout';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('D - volume breakout');
    });

    it('should use different timeframe symbols', () => {
      const weeklyTimeFrame = new TimeFrameConfig('W', 'weekly-style', 2);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(weeklyTimeFrame);

      const result = journalManager.createReasonText('support');

      expect(result).toBe('W - support');
    });

    it('should handle monthly timeframe', () => {
      const monthlyTimeFrame = new TimeFrameConfig('M', 'monthly-style', 3);
      mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(monthlyTimeFrame);

      const result = journalManager.createReasonText('trend');

      expect(result).toBe('M - trend');
    });

    it('should handle very long reason text', () => {
      const longReason = 'very long reason text that might be used for detailed analysis';

      const result = journalManager.createReasonText(longReason);

      expect(result).toBe(`D - ${longReason}`);
    });

    it('should handle unicode characters in reason', () => {
      const unicodeReason = 'trend↗️📈';

      const result = journalManager.createReasonText(unicodeReason);

      expect(result).toBe(`D - ${unicodeReason}`);
    });

    it('should call getCurrentTimeFrameConfig exactly once', () => {
      journalManager.createReasonText('test');

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('createJournalTag (private method testing)', () => {
    it('should create correct tag structure', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createEntry('TEST', JournalType.SET, 'reason');

      // Verify the tag was created correctly through the recordTicker call
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith('TEST.mwd.set.reason');
    });

    it('should handle all journal types correctly', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      // Test SET type
      await journalManager.createEntry('STOCK1', JournalType.SET, 'setup');
      expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith('STOCK1.yr.set.setup');

      // Test RESULT type
      await journalManager.createEntry('STOCK2', JournalType.RESULT, 'profit');
      expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith('STOCK2.yr.result.profit');

      // Test REJECTED type
      await journalManager.createEntry('STOCK3', JournalType.REJECTED, 'nosetup');
      expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith('STOCK3.yr.rejected.nosetup');
    });

    it('should handle both sequence types correctly', async () => {
      // Test MWD sequence
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      await journalManager.createEntry('STOCK1', JournalType.SET, 'reason1');
      expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith('STOCK1.mwd.set.reason1');

      // Test YR sequence
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
      await journalManager.createEntry('STOCK2', JournalType.RESULT, 'reason2');
      expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith('STOCK2.yr.result.reason2');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from entry creation to notification', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockKohanClient.recordTicker.mockResolvedValue(undefined);

      const ticker = 'INTEGRATION_TEST';
      const type = JournalType.SET;
      const reason = 'complete_workflow';

      await journalManager.createEntry(ticker, type, reason);

      // Verify sequence was retrieved
      expect(mockSequenceManager.getCurrentSequence).toHaveBeenCalled();

      // Verify client was called with correct tag
      const expectedTag = 'INTEGRATION_TEST.mwd.set.complete_workflow';
      expect(mockKohanClient.recordTicker).toHaveBeenCalledWith(expectedTag);

      // Verify success notification
      expect(Notifier.success).toHaveBeenCalledWith(`Journal entry created: ${expectedTag}`);
    });

    it('should handle reason text creation with different timeframes', () => {
      const testCases = [
        { symbol: 'D', expected: 'D - test' },
        { symbol: 'W', expected: 'W - test' },
        { symbol: 'M', expected: 'M - test' },
        { symbol: '3M', expected: '3M - test' },
      ];

      testCases.forEach(({ symbol, expected }) => {
        const timeFrameConfig = new TimeFrameConfig(symbol, 'style', 1);
        mockTimeFrameManager.getCurrentTimeFrameConfig.mockReturnValue(timeFrameConfig);

        const result = journalManager.createReasonText('test');
        expect(result).toBe(expected);
      });
    });

    it('should handle error scenarios gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockKohanClient.recordTicker.mockRejectedValue(networkError);

      await expect(journalManager.createEntry('ERROR_TEST', JournalType.RESULT, 'fail')).rejects.toThrow(
        'Network timeout'
      );

      // Verify no success notification was sent
      expect(Notifier.success).not.toHaveBeenCalled();
    });

    it('should maintain tag format consistency across different scenarios', async () => {
      const testScenarios = [
        {
          ticker: 'AAPL',
          sequence: SequenceType.MWD,
          type: JournalType.SET,
          reason: 'breakout',
          expected: 'AAPL.mwd.set.breakout',
        },
        {
          ticker: 'GOOGL',
          sequence: SequenceType.YR,
          type: JournalType.RESULT,
          reason: 'target_hit',
          expected: 'GOOGL.yr.result.target_hit',
        },
        {
          ticker: 'MSFT',
          sequence: SequenceType.MWD,
          type: JournalType.REJECTED,
          reason: '',
          expected: 'MSFT.mwd.rejected',
        },
      ];

      for (const scenario of testScenarios) {
        mockSequenceManager.getCurrentSequence.mockReturnValue(scenario.sequence);

        await journalManager.createEntry(scenario.ticker, scenario.type, scenario.reason);

        expect(mockKohanClient.recordTicker).toHaveBeenLastCalledWith(scenario.expected);
      }
    });
  });
});
