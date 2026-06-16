import { JournalManager, IJournalManager } from '../../src/manager/journal';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { IJournalClient } from '../../src/client/journal';
import { IOsClient } from '../../src/client/os';
import {
  CreateJournalInput,
  JournalRecord,
  JournalApiTimeframe,
  JournalApiSequence,
  JournalResultStatus,
} from '../../src/models/journal';
import { Sequence } from '../../src/models/timeframe';
import { ScreenshotResponse } from '../../src/models/os';

// Mock Notifier
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
  },
}));

// Mock GM
(global as any).GM = {
  setValue: jest.fn(),
};

describe('JournalManager', () => {
  let journalManager: IJournalManager;
  let mockJournalClient: jest.Mocked<IJournalClient>;
  let mockOsClient: jest.Mocked<IOsClient>;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  const createMockJournalRecord = (overrides: Partial<JournalRecord> = {}): JournalRecord => ({
    id: 'ext-1',
    ticker: 'AAPL',
    sequence: 'MWD' as JournalApiSequence,
    type: 'TAKEN',
    status: 'RUNNING',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const createDefaultScreenshots = (): ScreenshotResponse[] => [
    { file_name: 'ss1.png', full_path: '/ss1.png', timeframe: 'TMN' as JournalApiTimeframe },
    { file_name: 'ss2.png', full_path: '/ss2.png', timeframe: 'MN' as JournalApiTimeframe },
    { file_name: 'ss3.png', full_path: '/ss3.png', timeframe: 'WK' as JournalApiTimeframe },
    { file_name: 'ss4.png', full_path: '/ss4.png', timeframe: 'DL' as JournalApiTimeframe },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock JournalClient
    mockJournalClient = {
      createJournal: jest.fn().mockResolvedValue(createMockJournalRecord()),
      listJournals: jest.fn(),
      addJournalImage: jest.fn(),
      addJournalTag: jest.fn(),
      updateJournalStatus: jest.fn(),
    } as unknown as jest.Mocked<IJournalClient>;

    // Mock OsClient
    mockOsClient = {
      screenshot: jest.fn(),
    } as unknown as jest.Mocked<IOsClient>;

    // Mock TimeFrameManager
    mockTimeFrameManager = {
      applyTimeFrame: jest.fn().mockResolvedValue(true),
      getCurrentTimeFrameConfig: jest.fn().mockReturnValue({ symbol: 'TMN', style: 'T', toolbar: 5 }),
      getExactTimeframesForCurrentTicker: jest.fn(),
      getSequenceForCurrentTicker: jest.fn().mockResolvedValue(
        ['TMN', 'MN', 'WK', 'DL'] as Sequence
      ),
      getTimeFrameConfigByCode: jest.fn(),
      toggleTimeframeForCurrentTicker: jest.fn(),
      getDefaultTimeframesForExchange: jest.fn(),
      getLegacyJournalSequenceFromTimeframes: jest.fn().mockImplementation(
        (timeframes: string[]) => timeframes.includes('DL') ? 'MWD' as any : 'YR' as any
      ),
    } as unknown as jest.Mocked<ITimeFrameManager>;

    journalManager = new JournalManager(mockJournalClient, mockOsClient, mockTimeFrameManager);
  });

  describe('Constructor', () => {
    it('should create instance with journal, OS, and timeframe dependencies', () => {
      expect(journalManager).toBeInstanceOf(JournalManager);
    });
  });

  describe('publishJournalOpenEvent', () => {
    it('should persist journal open event with journal id', async () => {
      await journalManager.publishJournalOpenEvent('ext-1');

      expect(GM.setValue).toHaveBeenCalledWith(
        expect.stringContaining('journalOpenEvent'),
        expect.stringContaining('ext-1')
      );
    });
  });

  describe('createJournal', () => {
    it('should create journal with legacy sequence MWD when screenshots contain DL', async () => {
      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: '',
      };

      await journalManager.createJournal(input);

      expect(mockJournalClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'AAPL',
          sequence: 'MWD',
        })
      );
    });

    it('should create journal with legacy sequence YR when screenshots do not contain DL', async () => {
      const screenshots: ScreenshotResponse[] = [
        { file_name: 'ss1.png', full_path: '/ss1.png', timeframe: 'SMN' as JournalApiTimeframe },
        { file_name: 'ss2.png', full_path: '/ss2.png', timeframe: 'TMN' as JournalApiTimeframe },
        { file_name: 'ss3.png', full_path: '/ss3.png', timeframe: 'MN' as JournalApiTimeframe },
        { file_name: 'ss4.png', full_path: '/ss4.png', timeframe: 'WK' as JournalApiTimeframe },
      ];

      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots,
        reason: '',
      };

      await journalManager.createJournal(input);

      expect(mockJournalClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          sequence: 'YR',
        })
      );
    });

    it('should map screenshots to API timeframes', async () => {
      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: '',
      };

      await journalManager.createJournal(input);

      expect(mockJournalClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [
            { timeframe: 'TMN' as JournalApiTimeframe, file_name: 'ss1.png' },
            { timeframe: 'MN' as JournalApiTimeframe, file_name: 'ss2.png' },
            { timeframe: 'WK' as JournalApiTimeframe, file_name: 'ss3.png' },
            { timeframe: 'DL' as JournalApiTimeframe, file_name: 'ss4.png' },
          ],
        })
      );
    });

    it('should parse reason tags with override', async () => {
      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: 'HGS - oe',
      };

      await journalManager.createJournal(input);

      expect(mockJournalClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [{ tag: 'HGS ', type: 'REASON', override: ' oe' }],
        })
      );
    });

    it('should handle screenshots without reason', async () => {
      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: '',
      };

      await journalManager.createJournal(input);

      expect(mockJournalClient.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: undefined,
        })
      );
    });

    it('should return created journal record', async () => {
      const expectedRecord = createMockJournalRecord({ id: 'ext-2' });
      mockJournalClient.createJournal.mockResolvedValue(expectedRecord);

      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: '',
      };

      const result = await journalManager.createJournal(input);

      expect(result).toEqual(expectedRecord);
    });

    it('should propagate client errors', async () => {
      mockJournalClient.createJournal.mockRejectedValue(new Error('API Error'));

      const input: CreateJournalInput = {
        ticker: 'AAPL',
        type: 'TAKEN',
        status: 'RUNNING',
        screenshots: createDefaultScreenshots(),
        reason: '',
      };

      await expect(journalManager.createJournal(input)).rejects.toThrow('API Error');
    });
  });

  describe('screenshot ticker flow', () => {
    beforeEach(() => {
      mockOsClient.screenshot = jest.fn().mockImplementation(({ file_name }) =>
        Promise.resolve({ file_name, full_path: `/tmp/${file_name}`, timeframe: undefined })
      );
    });

    it('should capture screenshots for applied tuple TMN, MN, WK, DL', async () => {
      mockTimeFrameManager.getSequenceForCurrentTicker.mockResolvedValue(
        ['TMN', 'MN', 'WK', 'DL'] as Sequence
      );

      const screenshots = await journalManager.screenshotTicker('AAPL', 'set');

      expect(screenshots).toHaveLength(4);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenCalledTimes(4);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(1, 0);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(2, 1);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(3, 2);
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenNthCalledWith(4, 3);
      expect(screenshots[0].file_name).toContain('_1_tmn_set.png');
      expect(screenshots[1].file_name).toContain('_2_mn_set.png');
      expect(screenshots[2].file_name).toContain('_3_wk_set.png');
      expect(screenshots[3].file_name).toContain('_4_dl_set.png');
    });

    it('should capture screenshots for applied tuple SMN, TMN, MN, WK', async () => {
      mockTimeFrameManager.getSequenceForCurrentTicker.mockResolvedValue(
        ['SMN', 'TMN', 'MN', 'WK'] as Sequence
      );

      const screenshots = await journalManager.screenshotTicker('AAPL', 'set');

      expect(screenshots).toHaveLength(4);
      expect(screenshots[0].file_name).toContain('_1_smn_set.png');
      expect(screenshots[1].file_name).toContain('_2_tmn_set.png');
      expect(screenshots[2].file_name).toContain('_3_mn_set.png');
      expect(screenshots[3].file_name).toContain('_4_wk_set.png');
    });

    it('should abort when screenshot fails', async () => {
      mockOsClient.screenshot = jest
        .fn()
        .mockResolvedValueOnce({ file_name: 'ok.png', full_path: '/ok.png', timeframe: 'TMN' as JournalApiTimeframe })
        .mockRejectedValue(new Error('Screenshot failed'));

      mockTimeFrameManager.getSequenceForCurrentTicker.mockResolvedValue(
        ['TMN', 'MN', 'WK', 'DL'] as Sequence
      );

      await expect(journalManager.screenshotTicker('AAPL', 'error')).rejects.toThrow('Screenshot failed');
      expect(mockTimeFrameManager.applyTimeFrame).toHaveBeenCalledTimes(2);
    });

    it('should always capture exactly 4 screenshots from applied tuple', async () => {
      mockTimeFrameManager.getSequenceForCurrentTicker.mockResolvedValue(
        ['SMN', 'TMN', 'MN', 'WK'] as Sequence
      );

      const screenshots = await journalManager.screenshotTicker('AAPL', 'journal');

      expect(screenshots).toHaveLength(4);
    });
  });

  describe('createReasonText', () => {
    it('should create formatted reason text with current timeframe', () => {
      const result = journalManager.createReasonText('HGS');

      expect(mockTimeFrameManager.getCurrentTimeFrameConfig).toHaveBeenCalledTimes(1);
      expect(result).toBe('TMN - HGS');
    });
  });

  describe('findRunningJournal', () => {
    it('should return the latest TAKEN/RUNNING journal for ticker', async () => {
      const mockJournals = [createMockJournalRecord({ id: 'ext-1' })];
      mockJournalClient.listJournals = jest.fn().mockResolvedValue({
        journals: mockJournals,
        metadata: { total: 1 },
      });

      const result = await journalManager.findRunningJournal('AAPL');

      expect(mockJournalClient.listJournals).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: 'AAPL',
          type: 'TAKEN',
          status: 'RUNNING',
        })
      );
      expect(result).toEqual(mockJournals[0]);
    });

    it('should return null when no running journal exists', async () => {
      mockJournalClient.listJournals = jest.fn().mockResolvedValue({
        journals: [],
        metadata: { total: 0 },
      });

      const result = await journalManager.findRunningJournal('AAPL');

      expect(result).toBeNull();
    });

    it('should throw when multiple running journals exist', async () => {
      const mockJournals = [
        createMockJournalRecord({ id: 'ext-1' }),
        createMockJournalRecord({ id: 'ext-2' }),
      ];
      mockJournalClient.listJournals = jest.fn().mockResolvedValue({
        journals: mockJournals,
        metadata: { total: 2 },
      });

      await expect(journalManager.findRunningJournal('AAPL')).rejects.toThrow('Multiple running journals');
    });
  });

  describe('addJournalImages', () => {
    it('should add each screenshot as an image to the journal', async () => {
      const screenshots: ScreenshotResponse[] = [
        { file_name: 'ss1.png', full_path: '/ss1.png', timeframe: 'TMN' as JournalApiTimeframe },
        { file_name: 'ss2.png', full_path: '/ss2.png', timeframe: 'MN' as JournalApiTimeframe },
      ];

      await journalManager.addJournalImages('ext-1', screenshots);

      expect(mockJournalClient.addJournalImage).toHaveBeenCalledTimes(2);
      expect(mockJournalClient.addJournalImage).toHaveBeenNthCalledWith(1, 'ext-1', {
        timeframe: 'TMN',
        file_name: 'ss1.png',
      });
    });
  });

  describe('addReasonTags', () => {
    it('should parse reason and add tags to the journal', async () => {
      await journalManager.addReasonTags('ext-1', 'HGS');

      expect(mockJournalClient.addJournalTag).toHaveBeenCalledWith('ext-1', {
        tag: 'HGS',
        type: 'REASON',
      });
    });

    it('should skip empty reason', async () => {
      await journalManager.addReasonTags('ext-1', '');

      expect(mockJournalClient.addJournalTag).not.toHaveBeenCalled();
    });
  });

  describe('updateJournalStatus', () => {
    it('should patch journal status with SUCCESS', async () => {
      await journalManager.updateJournalStatus('ext-1', 'SUCCESS' as JournalResultStatus);

      expect(mockJournalClient.updateJournalStatus).toHaveBeenCalledWith('ext-1', { status: 'SUCCESS' });
    });
  });
});
