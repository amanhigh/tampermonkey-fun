import { JournalManager, IJournalManager } from '../../src/manager/journal';
import { ISequenceManager } from '../../src/manager/sequence';
import { IKohanClient } from '../../src/client/kohan';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { SequenceType } from '../../src/models/trading';
import { TimeFrameConfig } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';

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
  let mockGMSetValue: jest.Mock;

  const mockTimeFrameConfig = new TimeFrameConfig('DL', 'daily-style', 1);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGMSetValue = jest.fn().mockResolvedValue(undefined);
    (global as any).GM = { setValue: mockGMSetValue };

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
      listJournals: jest.fn(),
      addJournalImage: jest.fn(),
      addJournalTag: jest.fn(),
      updateJournalStatus: jest.fn(),
      getClip: jest.fn().mockResolvedValue('clipboard-data'),
      enableSubmap: jest.fn().mockResolvedValue(undefined),
      disableSubmap: jest.fn().mockResolvedValue(undefined),
      createJournal: jest.fn().mockResolvedValue({
        id: 'jrn_123',
        ticker: 'TEST',
        sequence: 'MWD',
        type: 'REJECTED',
        status: 'FAIL',
        created_at: '2024-01-01T00:00:00Z',
      }),
      screenshot: jest.fn().mockImplementation(({ file_name }: { file_name: string }) =>
        Promise.resolve({
          file_name,
          full_path: `/home/aman/Downloads/${file_name}`,
        })
      ),
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

  describe('publishJournalOpenEvent', () => {
    it('should persist journal open event with journal id', async () => {
      await journalManager.publishJournalOpenEvent('jrn_999');

      expect(mockGMSetValue).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.JOURNAL_OPEN,
        expect.stringMatching(/"journalId":"jrn_999"/)
      );
    });

    it('should propagate GM errors', async () => {
      mockGMSetValue.mockRejectedValue(new Error('storage unavailable'));

      await expect(journalManager.publishJournalOpenEvent('jrn_999')).rejects.toThrow('storage unavailable');
    });
  });

  describe('createJournal', () => {
    it('should create journal with screenshots mapped to API timeframes', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      const input = {
        ticker: 'TCS',
        reason: 'oe',
        type: 'REJECTED' as const,
        status: 'FAIL' as const,
        screenshots: [
          { file_name: 'TCS_20240101_1200_1_tmn_rejected.png', full_path: '/path/1', timeframe: 'TMN' as const },
          { file_name: 'TCS_20240101_1200_2_mn_rejected.png', full_path: '/path/2', timeframe: 'MN' as const },
          { file_name: 'TCS_20240101_1200_3_wk_rejected.png', full_path: '/path/3', timeframe: 'WK' as const },
          { file_name: 'TCS_20240101_1200_4_dl_rejected.png', full_path: '/path/4', timeframe: 'DL' as const },
        ],
      };

      await journalManager.createJournal(input);

      expect(mockKohanClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'TCS',
          sequence: 'MWD',
          type: 'REJECTED',
          status: 'FAIL',
          images: [
            { timeframe: 'TMN', file_name: 'TCS_20240101_1200_1_tmn_rejected.png' },
            { timeframe: 'MN', file_name: 'TCS_20240101_1200_2_mn_rejected.png' },
            { timeframe: 'WK', file_name: 'TCS_20240101_1200_3_wk_rejected.png' },
            { timeframe: 'DL', file_name: 'TCS_20240101_1200_4_dl_rejected.png' },
          ],
        })
      );
    });

    it('should parse reason tags with override', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);

      const input = {
        ticker: 'HGS',
        reason: 'oe-override-value',
        type: 'REJECTED' as const,
        status: 'FAIL' as const,
        screenshots: [
          { file_name: 'HGS_20240101_1200_1_smn_rejected.png', full_path: '/path/1', timeframe: 'SMN' as const },
        ],
      };

      await journalManager.createJournal(input);

      expect(mockKohanClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ tag: 'oe', type: 'REASON', override: 'override-value' }],
        })
      );
    });

    it('should handle screenshots without reason', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      const input = {
        ticker: 'AAPL',
        reason: '',
        type: 'REJECTED' as const,
        status: 'FAIL' as const,
        screenshots: [
          { file_name: 'AAPL_20240101_1200_1_tmn_rejected.png', full_path: '/path/1', timeframe: 'TMN' as const },
        ],
      };

      await journalManager.createJournal(input);

      expect(mockKohanClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: undefined,
        })
      );
    });

    it('should create TAKEN setup journal with markdown note', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);

      await journalManager.createJournal({
        ticker: 'AAPL',
        reason: 'oe',
        screenshots: [{ file_name: 'AAPL_20240101_1200_1_tmn_set.png', full_path: '/path/1', timeframe: 'TMN' as const }],
        type: 'TAKEN',
        status: 'SET',
        notes: [
          {
            status: 'SET',
            content: Constants.TRADING.PROMPT.TRADE_INFO,
            format: 'MARKDOWN',
          },
        ],
      });

      expect(mockKohanClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'AAPL',
          sequence: 'MWD',
          type: 'TAKEN',
          status: 'SET',
          notes: [
            {
              status: 'SET',
              content: Constants.TRADING.PROMPT.TRADE_INFO,
              format: 'MARKDOWN',
            },
          ],
        })
      );
    });

    it('should return created journal record', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      const mockRecord = {
        id: 'jrn_456',
        ticker: 'INFY',
        sequence: 'MWD' as const,
        type: 'REJECTED' as const,
        status: 'FAIL' as const,
        created_at: '2024-01-01T00:00:00Z',
      };
      mockKohanClient.createJournal.mockResolvedValue(mockRecord);

      const result = await journalManager.createJournal({
        ticker: 'INFY',
        reason: 'test',
        type: 'REJECTED' as const,
        status: 'FAIL' as const,
        screenshots: [
          { file_name: 'INFY_20240101_1200_1_tmn_rejected.png', full_path: '/path/1', timeframe: 'TMN' as const },
        ],
      });

      expect(result).toEqual(mockRecord);
    });

    it('should propagate client errors', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockKohanClient.createJournal.mockRejectedValue(new Error('journal api error'));

      await expect(
        journalManager.createJournal({
          ticker: 'FAIL',
          reason: 'test',
          type: 'REJECTED' as const,
          status: 'FAIL' as const,
          screenshots: [
            { file_name: 'FAIL_20240101_1200_1_tmn_rejected.png', full_path: '/path/1', timeframe: 'TMN' as const },
          ],
        })
      ).rejects.toThrow('journal api error');
    });
  });

  describe('screenshot ticker flow', () => {
    beforeEach(() => {
      (mockKohanClient as any).screenshot = jest.fn();
    });

    it('should resolve MWD to TMN, MN, WK, D and call screenshot four times', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockSequenceManager.sequenceToTimeFrameConfig.mockImplementation((sequence, position) => {
        const configs: Record<string, TimeFrameConfig[]> = {
          MWD: [
            new TimeFrameConfig('TMN', 't', 5),
            new TimeFrameConfig('MN', 'vh', 4),
            new TimeFrameConfig('WK', 'h', 3),
            new TimeFrameConfig('DL', 'i', 2),
          ],
          YR: [
            new TimeFrameConfig('SMN', 'i', 6),
            new TimeFrameConfig('TMN', 't', 5),
            new TimeFrameConfig('MN', 'vh', 4),
            new TimeFrameConfig('WK', 'h', 3),
          ],
        };

        return configs[sequence][position];
      });
      (mockKohanClient as any).screenshot.mockImplementation(({ file_name }: { file_name: string }) =>
        Promise.resolve({
          file_name,
          full_path: `/home/aman/Downloads/${file_name}`,
        })
      );

      const result = await (journalManager as any).screenshotTicker('TCS', 'Rejected');

      expect(mockSequenceManager.getCurrentSequence).toHaveBeenCalled();
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(1, 0);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(2, 1);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(3, 2);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(4, 3);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenNthCalledWith(1, SequenceType.MWD, 0);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenNthCalledWith(2, SequenceType.MWD, 1);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenNthCalledWith(3, SequenceType.MWD, 2);
      expect(mockSequenceManager.sequenceToTimeFrameConfig).toHaveBeenNthCalledWith(4, SequenceType.MWD, 3);
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_1_tmn_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_2_mn_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_3_wk_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_4_dl_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect(result).toHaveLength(4);
      expect(result[0].file_name).toMatch(/^TCS_\d{8}_\d{4}_1_tmn_rejected\.png$/);
      expect(result[1].file_name).toMatch(/^TCS_\d{8}_\d{4}_2_mn_rejected\.png$/);
      expect(result[2].file_name).toMatch(/^TCS_\d{8}_\d{4}_3_wk_rejected\.png$/);
      expect(result[3].file_name).toMatch(/^TCS_\d{8}_\d{4}_4_dl_rejected\.png$/);
      expect(result[0].timeframe).toBe('TMN');
      expect(result[1].timeframe).toBe('MN');
      expect(result[2].timeframe).toBe('WK');
      expect(result[3].timeframe).toBe('DL');
    });

    it('should resolve YR to SMN, TMN, MN, WK and preserve returned metadata', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
      mockSequenceManager.sequenceToTimeFrameConfig.mockImplementation((sequence, position) => {
        const configs: Record<string, TimeFrameConfig[]> = {
          MWD: [
            new TimeFrameConfig('TMN', 't', 5),
            new TimeFrameConfig('MN', 'vh', 4),
            new TimeFrameConfig('WK', 'h', 3),
            new TimeFrameConfig('DL', 'i', 2),
          ],
          YR: [
            new TimeFrameConfig('SMN', 'i', 6),
            new TimeFrameConfig('TMN', 't', 5),
            new TimeFrameConfig('MN', 'vh', 4),
            new TimeFrameConfig('WK', 'h', 3),
          ],
        };

        return configs[sequence][position];
      });
      (mockKohanClient as any).screenshot.mockImplementation(({ file_name }: { file_name: string }) =>
        Promise.resolve({
          file_name,
          full_path: `/home/aman/Downloads/${file_name}`,
        })
      );

      const result = await (journalManager as any).screenshotTicker('TCS', 'Rejected');

      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_1_smn_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_2_tmn_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_3_mn_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect((mockKohanClient as any).screenshot).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_4_wk_rejected\.png$/),
          directory_type: 'JOURNAL',
          type: 'FULL',
          notify: false,
          window: 'TradingView',
        })
      );
      expect(result).toHaveLength(4);
      expect(result[0].timeframe).toBe('SMN');
      expect(result[1].timeframe).toBe('TMN');
      expect(result[2].timeframe).toBe('MN');
      expect(result[3].timeframe).toBe('WK');
    });

    it('should abort when screenshot fails', async () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockSequenceManager.sequenceToTimeFrameConfig.mockReturnValue(new TimeFrameConfig('TMN', 't', 5));
      (mockKohanClient as any).screenshot.mockRejectedValue(new Error('screenshot failed'));

      await expect((journalManager as any).screenshotTicker('TCS', 'Rejected')).rejects.toThrow('screenshot failed');
    });
  });

  describe('screenshotChecklist', () => {
    it('should capture REGION checklist screenshot with DL timeframe metadata', async () => {
      const result = await (journalManager as any).screenshotChecklist('TCS', 'set');

      expect(mockKohanClient.screenshot).toHaveBeenCalledWith({
        file_name: expect.stringMatching(/^TCS_\d{8}_\d{4}_checklist_set\.png$/),
        directory_type: 'JOURNAL',
        type: 'REGION',
        notify: false,
      });
      expect(result.timeframe).toBe('DL');
    });

    it('should propagate checklist screenshot errors', async () => {
      (mockKohanClient as any).screenshot.mockRejectedValue(new Error('screenshot failed'));

      await expect((journalManager as any).screenshotChecklist('TCS', 'set')).rejects.toThrow('screenshot failed');
    });
  });

  describe('createReasonText', () => {
    it('should create formatted reason text with current timeframe', () => {
      const testReason = 'breakout';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('DL - breakout');
      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalled();
    });

    it('should handle empty reason', () => {
      const result = journalManager.createReasonText('');

      expect(result).toBe('DL - ');
    });

    it('should handle reason with special characters', () => {
      const testReason = 'test-reason_123';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('DL - test-reason_123');
    });

    it('should handle reason with spaces', () => {
      const testReason = 'volume breakout';

      const result = journalManager.createReasonText(testReason);

      expect(result).toBe('DL - volume breakout');
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

      expect(result).toBe(`DL - ${longReason}`);
    });

    it('should handle unicode characters in reason', () => {
      const unicodeReason = 'trend↗️📈';

      const result = journalManager.createReasonText(unicodeReason);

      expect(result).toBe(`DL - ${unicodeReason}`);
    });

    it('should call getCurrentTimeFrameConfig exactly once', () => {
      journalManager.createReasonText('test');

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('findRunningJournal', () => {
    it('should return the latest TAKEN/RUNNING journal for ticker', async () => {
      const mockJournal = { id: 'jrn_running', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING' };
      mockKohanClient.listJournals.mockResolvedValue({
        journals: [mockJournal as any],
        metadata: { total: 1, offset: 0, limit: 5 },
      });

      const result = await journalManager.findRunningJournal('TCS');

      expect(mockKohanClient.listJournals).toHaveBeenCalledWith({
        ticker: 'TCS',
        type: 'TAKEN',
        status: 'RUNNING',
        limit: 5,
        'sort-by': 'created_at',
        'sort-order': 'desc',
      });
      expect(result).toEqual(mockJournal);
    });

    it('should return null when no running journal exists', async () => {
      mockKohanClient.listJournals.mockResolvedValue({
        journals: [],
        metadata: { total: 0, offset: 0, limit: 5 },
      });

      const result = await journalManager.findRunningJournal('TCS');

      expect(result).toBeNull();
    });

    it('should throw when multiple running journals exist', async () => {
      const journal1 = { id: 'jrn_1', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING' };
      const journal2 = { id: 'jrn_2', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING' };
      mockKohanClient.listJournals.mockResolvedValue({
        journals: [journal1 as any, journal2 as any],
        metadata: { total: 2, offset: 0, limit: 5 },
      });

      await expect(journalManager.findRunningJournal('TCS')).rejects.toThrow(
        'Multiple running journals found for TCS. Using the most recent.'
      );
    });
  });

  describe('addJournalImages', () => {
    it('should add each screenshot as an image to the journal', async () => {
      const journalId = 'jrn_123';
      const screenshots = [
        { file_name: 'img1.png', full_path: '/path/1', timeframe: 'TMN' as const },
        { file_name: 'img2.png', full_path: '/path/2', timeframe: 'MN' as const },
      ];

      await journalManager.addJournalImages(journalId, screenshots as any);

      expect(mockKohanClient.addJournalImage).toHaveBeenCalledTimes(2);
      expect(mockKohanClient.addJournalImage).toHaveBeenNthCalledWith(1, journalId, {
        timeframe: 'TMN',
        file_name: 'img1.png',
      });
      expect(mockKohanClient.addJournalImage).toHaveBeenNthCalledWith(2, journalId, {
        timeframe: 'MN',
        file_name: 'img2.png',
      });
    });
  });

  describe('addReasonTags', () => {
    it('should parse reason and add tags to the journal', async () => {
      const journalId = 'jrn_123';

      await journalManager.addReasonTags(journalId, 'oe');

      expect(mockKohanClient.addJournalTag).toHaveBeenCalledWith(journalId, {
        tag: 'oe',
        type: 'REASON',
      });
    });

    it('should parse reason with override and add tag', async () => {
      const journalId = 'jrn_123';

      await journalManager.addReasonTags(journalId, 'oe-loc');

      expect(mockKohanClient.addJournalTag).toHaveBeenCalledWith(journalId, {
        tag: 'oe',
        type: 'REASON',
        override: 'loc',
      });
    });

    it('should skip empty reason', async () => {
      const journalId = 'jrn_123';

      await journalManager.addReasonTags(journalId, '');

      expect(mockKohanClient.addJournalTag).not.toHaveBeenCalled();
    });
  });

  describe('updateJournalStatus', () => {
    it('should patch journal status with SUCCESS', async () => {
      const journalId = 'jrn_123';

      await journalManager.updateJournalStatus(journalId, 'SUCCESS');

      expect(mockKohanClient.updateJournalStatus).toHaveBeenCalledWith(journalId, { status: 'SUCCESS' });
    });

    it('should patch journal status with FAIL', async () => {
      const journalId = 'jrn_123';

      await journalManager.updateJournalStatus(journalId, 'FAIL');

      expect(mockKohanClient.updateJournalStatus).toHaveBeenCalledWith(journalId, { status: 'FAIL' });
    });

    it('should patch journal status with MISSED', async () => {
      const journalId = 'jrn_123';

      await journalManager.updateJournalStatus(journalId, 'MISSED');

      expect(mockKohanClient.updateJournalStatus).toHaveBeenCalledWith(journalId, { status: 'MISSED' });
    });
  });
});
