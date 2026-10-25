import { JournalHandler } from '../../src/handler/journal';
import { IOsClient } from '../../src/client/os';
import { IJournalManager } from '../../src/manager/journal';
import { ISmartPrompt, SmartChoiceGroup, SmartPromptResponseType } from '../../src/util/smart';
import { IUIUtil } from '../../src/util/ui';
import { ITradingViewManager } from '../../src/manager/tv';
import { IStyleManager } from '../../src/manager/style';
import { DomManager } from '../../src/manager/dom';
import { ICategoryManager } from '../../src/manager/category';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { IJournalSyncHandler } from '../../src/handler/journal_sync';
import { JournalActionType } from '../../src/models/journal';
import { Constants } from '../../src/models/constant';
import { TickerTimeframe, Sequence } from '../../src/models/timeframe';
import { Notifier } from '../../src/util/notify';

jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    red: jest.fn(),
    yellow: jest.fn(),
    green: jest.fn(),
  },
}));

describe('JournalHandler', () => {
  let journalHandler: JournalHandler;
  let mockTickerManager: jest.Mocked<DomManager>;
  let mockOsClient: jest.Mocked<IOsClient>;
  let mockJournalManager: jest.Mocked<IJournalManager>;
  let mockSmartPrompt: jest.Mocked<ISmartPrompt>;
  let mockUiUtil: jest.Mocked<IUIUtil>;
  let mockTradingViewManager: jest.Mocked<ITradingViewManager>;
  let mockStyleManager: jest.Mocked<IStyleManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;
  let mockJournalSyncHandler: jest.Mocked<IJournalSyncHandler>;
  let mockUiChain: { appendTo: jest.Mock; append: jest.Mock };

  const DL_SEQUENCE: Sequence = [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL];
  const NO_DL_SEQUENCE: Sequence = [TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK];

  const expectedOverrideGroup: SmartChoiceGroup = {
    id: Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID,
    label: 'Override',
    choices: Constants.TRADING.PROMPT.OVERRIDES,
  };

  const expectedSequenceGroupTMN: SmartChoiceGroup = {
    id: Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID,
    label: 'Timeframe',
    choices: ['YR', 'SMN', 'TMN'],
    defaultChoice: 'TMN',
  };

  const expectedSequenceGroupSMN: SmartChoiceGroup = {
    id: Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID,
    label: 'Timeframe',
    choices: ['YR', 'SMN', 'TMN'],
    defaultChoice: 'SMN',
  };

  beforeEach(() => {
    mockTickerManager = {
      getTicker: jest.fn(),
      openTicker: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DomManager>;

    mockOsClient = {
      screenshotRegion: jest.fn(),
      screenshot: jest.fn(),
      getClip: jest.fn(),
      getBaseUrl: jest.fn(),
    } as unknown as jest.Mocked<IOsClient>;

    mockJournalManager = {
      createReasonText: jest.fn(),
      createJournal: jest.fn(),
      publishJournalOpenEvent: jest.fn().mockResolvedValue(undefined),
      screenshotTicker: jest.fn(),
      findRunningJournal: jest.fn(),
      addJournalImages: jest.fn().mockResolvedValue(undefined),
      addReasonTags: jest.fn().mockResolvedValue(undefined),
      updateJournalStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IJournalManager>;

    mockSmartPrompt = {
      showModal: jest.fn(),
      showTextareaModal: jest.fn(),
    } as unknown as jest.Mocked<ISmartPrompt>;

    mockUiChain = {
      appendTo: jest.fn(),
      append: jest.fn(),
    };
    mockUiChain.appendTo.mockReturnValue(mockUiChain);
    mockUiChain.append.mockReturnValue(mockUiChain);

    mockUiUtil = {
      toggleUI: jest.fn(),
      buildWrapper: jest.fn().mockReturnValue(mockUiChain),
      buildButton: jest.fn().mockReturnValue(mockUiChain),
    } as unknown as jest.Mocked<IUIUtil>;

    mockTradingViewManager = {
      clipboardCopy: jest.fn(),
      setSwiftKeysState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITradingViewManager>;

    mockStyleManager = {
      selectToolbar: jest.fn(),
    } as unknown as jest.Mocked<IStyleManager>;

    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      evictTicker: jest.fn(),
      publishCategoryChanged: jest.fn().mockResolvedValue(undefined),
      recordWatchCategory: jest.fn().mockResolvedValue(undefined),
      recordFlagCategory: jest.fn().mockResolvedValue(undefined),
      getBatchCategory: jest.fn().mockResolvedValue(new Map()),
      toggleReadyState: jest.fn().mockResolvedValue(undefined),
      clearReadyState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockTimeFrameManager = {
      getSequence: jest.fn().mockResolvedValue(DL_SEQUENCE),
    } as unknown as jest.Mocked<ITimeFrameManager>;

    mockJournalSyncHandler = {
      publishTvJournalRecorded: jest.fn((journalId: string) => mockJournalManager.publishJournalOpenEvent(journalId)),
    } as unknown as jest.Mocked<IJournalSyncHandler>;

    journalHandler = new JournalHandler(
      mockTickerManager,
      mockOsClient,
      mockJournalManager,
      mockSmartPrompt,
      mockUiUtil,
      mockTradingViewManager,
      mockStyleManager,
      mockCategoryManager,
      mockTimeFrameManager,
      mockJournalSyncHandler
    );
  });

  describe('handleRecordJournal', () => {
    it('should combine primary selection with override into reason-override format for REJECTED', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'oe',
        answers: {
          [Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID]: 'egf',
          [Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID]: 'TMN',
        },
      });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1',
        ticker: 'TCS',
        top_timeframe: TickerTimeframe.TMN,
        type: 'REJECTED',
        status: 'FAIL',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.REJECTED);

      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'rejected', TickerTimeframe.TMN);
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'oe-egf', topTimeframe: TickerTimeframe.TMN })
      );
    });

    it('should use primary selection alone when no override selected for REJECTED', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'oe',
        answers: {
          [Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID]: null,
          [Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID]: 'YR',
        },
      });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1',
        ticker: 'TCS',
        top_timeframe: TickerTimeframe.YR,
        type: 'REJECTED',
        status: 'FAIL',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.REJECTED);

      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'rejected', TickerTimeframe.YR);
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'oe', topTimeframe: TickerTimeframe.YR })
      );
    });

    it('should route REJECTED journal to screenshot ticker flow with sequence', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'oe',
        answers: {
          [Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID]: 'TMN',
        },
      });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1',
        ticker: 'TCS',
        top_timeframe: TickerTimeframe.TMN,
        type: 'REJECTED',
        status: 'FAIL',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.REJECTED);

      expect(mockTimeFrameManager.getSequence).toHaveBeenCalled();
      expect(mockSmartPrompt.showModal).toHaveBeenCalledWith(
        Constants.TRADING.PROMPT.REASONS,
        [expectedOverrideGroup, expectedSequenceGroupTMN]
      );
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'rejected', TickerTimeframe.TMN);
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith({
        ticker: 'TCS',
        reason: 'oe',
        type: 'REJECTED',
        status: 'FAIL',
        topTimeframe: TickerTimeframe.TMN,
        screenshots: [{ file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' }],
      });
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_1');
    });

    it('should default timeframe to SMN when ticker has non-DL sequence', async () => {
      mockTimeFrameManager.getSequence.mockResolvedValue(NO_DL_SEQUENCE);
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'oe',
        answers: {},
      });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.smn.rejected.png', full_path: '/p' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1', ticker: 'TCS', top_timeframe: TickerTimeframe.YR, type: 'REJECTED', status: 'FAIL', created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.REJECTED);

      expect(mockSmartPrompt.showModal).toHaveBeenCalledWith(
        Constants.TRADING.PROMPT.REASONS,
        [expectedOverrideGroup, expectedSequenceGroupSMN]
      );
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'rejected', TickerTimeframe.SMN);
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith(
        expect.objectContaining({ topTimeframe: TickerTimeframe.SMN })
      );
    });

    it('should retain default timeframe when REJECTED reason prompt returns NONE', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.NONE,
        value: 'none',
        answers: { [Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID]: 'TMN' },
      });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/p' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1', ticker: 'TCS', top_timeframe: TickerTimeframe.TMN, type: 'REJECTED', status: 'FAIL', created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.REJECTED);

      expect(Notifier.warn).toHaveBeenCalledWith('Rejected entries require a reason. Please provide a reason or cancel.');
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
    });

    it('should route SET journal to taken setup flow with sequence', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      // Step 1: note
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      // Step 2: checklist screenshot
      (mockOsClient.screenshotRegion as jest.Mock).mockResolvedValue({
        file_name: 'TCS_20240422_0930_checklist_set.png',
        full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png',
        timeframe: 'TMN',
      });
      // Step 3: reason prompt with sequence
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'oe',
        answers: { [Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID]: 'TMN' },
      });
      // Step 4: full screenshots
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_20240422_0930_1_tmn_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_1_tmn_set.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_2',
        ticker: 'TCS',
        top_timeframe: TickerTimeframe.TMN,
        type: 'TAKEN',
        status: 'SET',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalActionType.SET);

      expect(mockSmartPrompt.showTextareaModal).toHaveBeenCalledWith(
        'Trade Setup Note',
        Constants.TRADING.PROMPT.TRADE_INFO,
        'Save Note'
      );
      expect(mockOsClient.screenshotRegion).toHaveBeenCalledWith('TCS', 'set');
      expect(mockSmartPrompt.showModal).toHaveBeenCalledWith(
        Constants.TRADING.PROMPT.REASONS,
        [expectedOverrideGroup, expectedSequenceGroupTMN]
      );
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'set', TickerTimeframe.TMN);
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith({
        ticker: 'TCS',
        reason: 'oe',
        screenshots: [
          { file_name: 'TCS_20240422_0930_checklist_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png', timeframe: 'TMN' },
          { file_name: 'TCS_20240422_0930_1_tmn_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_1_tmn_set.png' },
        ],
        type: 'TAKEN',
        status: 'SET',
        topTimeframe: TickerTimeframe.TMN,
        notes: [
          {
            status: 'SET',
            content: Constants.TRADING.PROMPT.TRADE_INFO,
            format: 'MARKDOWN',
          },
        ],
      });
      expect(mockCategoryManager.publishCategoryChanged).toHaveBeenCalledWith(['TCS']);
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_2');
    });

    it('should abort SET journal flow when setup note popup is cancelled', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(null);

      await journalHandler.handleRecordJournal(JournalActionType.SET);

      expect(mockOsClient.screenshotRegion).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when setup note is empty', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue('   ');

      await journalHandler.handleRecordJournal(JournalActionType.SET);

      expect(mockOsClient.screenshotRegion).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when checklist region screenshot returns 409', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      (mockOsClient.screenshotRegion as jest.Mock).mockRejectedValue(new Error('409 Conflict: screenshot aborted'));

      await journalHandler.handleRecordJournal(JournalActionType.SET);

      expect(mockOsClient.screenshotRegion).toHaveBeenCalledWith('TCS', 'set');
      expect(Notifier.warn).toHaveBeenCalledWith('Checklist screenshot was cancelled, aborting journal creation.');
      expect(mockSmartPrompt.showModal).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when reason prompt is cancelled after checklist screenshot', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      (mockOsClient.screenshotRegion as jest.Mock).mockResolvedValue({
        file_name: 'TCS_20240422_0930_checklist_set.png',
        full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png',
        timeframe: 'TMN',
      });
      mockSmartPrompt.showModal.mockResolvedValue({ type: SmartPromptResponseType.CANCEL, value: null });

      await journalHandler.handleRecordJournal(JournalActionType.SET);

      expect(mockOsClient.screenshotRegion).toHaveBeenCalledWith('TCS', 'set');
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
    });

    it('should use stored YR top_timeframe for RESULT screenshots without Timeframe group', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running',
        ticker: 'TCS',
        type: 'TAKEN',
        status: 'RUNNING',
        top_timeframe: TickerTimeframe.YR,
      });
      // Status -> reason prompts
      mockSmartPrompt.showModal
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'SUCCESS', answers: {} })
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'oe', answers: {} });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_20240422_0930_1_yr_result.png', full_path: '/path/1', timeframe: 'YR' },
      ]);

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(mockJournalManager.findRunningJournal).toHaveBeenCalledWith('TCS');
      expect(mockSmartPrompt.showModal).toHaveBeenNthCalledWith(1, ['SUCCESS', 'FAIL', 'MISSED']);
      expect(mockSmartPrompt.showModal).toHaveBeenNthCalledWith(2, Constants.TRADING.PROMPT.REASONS, [expectedOverrideGroup]);
      expect(mockTimeFrameManager.getSequence).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'result', TickerTimeframe.YR);
      expect(mockJournalManager.addJournalImages).toHaveBeenCalledWith('jrn_running', [
        { file_name: 'TCS_20240422_0930_1_yr_result.png', full_path: '/path/1', timeframe: 'YR' },
      ]);
      expect(mockJournalManager.addReasonTags).toHaveBeenCalledWith('jrn_running', 'oe');
      expect(mockJournalManager.updateJournalStatus).toHaveBeenCalledWith('jrn_running', 'SUCCESS');
      expect(mockCategoryManager.publishCategoryChanged).toHaveBeenCalledWith(['TCS']);
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_running');
    });

    it('should use stored TMN top_timeframe for RESULT screenshots', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running',
        ticker: 'TCS',
        type: 'TAKEN',
        status: 'RUNNING',
        top_timeframe: TickerTimeframe.TMN,
      });
      mockSmartPrompt.showModal
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'SUCCESS', answers: {} })
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'oe', answers: {} });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_20240422_0930_1_tmn_result.png', full_path: '/path/1', timeframe: 'TMN' },
      ]);

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(mockJournalManager.findRunningJournal).toHaveBeenCalledWith('TCS');
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'result', TickerTimeframe.TMN);
      expect(mockJournalManager.addJournalImages).toHaveBeenCalledWith('jrn_running', [
        { file_name: 'TCS_20240422_0930_1_tmn_result.png', full_path: '/path/1', timeframe: 'TMN' },
      ]);
    });

    it('should use stored SMN top_timeframe for RESULT screenshots', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running',
        ticker: 'TCS',
        type: 'TAKEN',
        status: 'RUNNING',
        top_timeframe: TickerTimeframe.SMN,
      });
      mockSmartPrompt.showModal
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'SUCCESS', answers: {} })
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'oe', answers: {} });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_20240422_0930_1_smn_result.png', full_path: '/path/1', timeframe: 'SMN' },
      ]);

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(mockJournalManager.findRunningJournal).toHaveBeenCalledWith('TCS');
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'result', TickerTimeframe.SMN);
      expect(mockJournalManager.addJournalImages).toHaveBeenCalledWith('jrn_running', [
        { file_name: 'TCS_20240422_0930_1_smn_result.png', full_path: '/path/1', timeframe: 'SMN' },
      ]);
    });

    it('should abort RESULT flow when no running journal found', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue(null);

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(Notifier.warn).toHaveBeenCalledWith('No running journal found for TCS. Result cannot be captured.');
      expect(mockSmartPrompt.showModal).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.addJournalImages).not.toHaveBeenCalled();
      expect(mockJournalManager.updateJournalStatus).not.toHaveBeenCalled();
    });

    it('should abort RESULT flow when status prompt is cancelled', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING',
      });
      mockSmartPrompt.showModal.mockResolvedValue({ type: SmartPromptResponseType.CANCEL, value: null });

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.updateJournalStatus).not.toHaveBeenCalled();
    });

    it('should abort RESULT flow when reason prompt is cancelled', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING',
      });
      mockSmartPrompt.showModal
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'SUCCESS', answers: {} })
        .mockResolvedValueOnce({ type: SmartPromptResponseType.CANCEL, value: null });

      await journalHandler.handleRecordJournal(JournalActionType.RESULT);

      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.updateJournalStatus).not.toHaveBeenCalled();
    });

    it('should NOT publish category change when updateJournalStatus fails', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      (mockJournalManager.findRunningJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_running', ticker: 'TCS', type: 'TAKEN', status: 'RUNNING',
      });
      mockSmartPrompt.showModal
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'SUCCESS', answers: {} })
        .mockResolvedValueOnce({ type: SmartPromptResponseType.SELECTED, primarySelection: 'oe', answers: {} });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_fail.png', full_path: '/path/fail', timeframe: 'TMN' },
      ]);
      (mockJournalManager.updateJournalStatus as jest.Mock).mockRejectedValue(new Error('Backend error'));

      await expect(journalHandler.handleRecordJournal(JournalActionType.RESULT)).rejects.toThrow('Backend error');

      expect(mockJournalManager.updateJournalStatus).toHaveBeenCalledWith('jrn_running', 'SUCCESS');
      expect(mockCategoryManager.publishCategoryChanged).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
    });
  });

  describe('renderToolbar', () => {
    it('builds the journal toolbar wrapper inside the journal area', () => {
      journalHandler.renderToolbar();

      expect(mockUiUtil.buildWrapper).toHaveBeenCalledWith(`${Constants.UI.IDS.AREAS.JOURNAL}-type`);
      expect(mockUiChain.appendTo).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
    });

    it('builds RJ, RS, and ST buttons that record the matching journal action', () => {
      const recordJournalSpy = jest.spyOn(journalHandler, 'handleRecordJournal').mockResolvedValue(undefined);

      journalHandler.renderToolbar();

      expect(mockUiUtil.buildButton).toHaveBeenCalledTimes(3);
      expect(mockUiUtil.buildButton.mock.calls.map((call) => call[0])).toEqual([
        Constants.UI.IDS.BUTTONS.JOURNAL_REJECTED,
        Constants.UI.IDS.BUTTONS.JOURNAL_RESULT,
        Constants.UI.IDS.BUTTONS.JOURNAL_SET,
      ]);
      expect(mockUiUtil.buildButton.mock.calls.map((call) => call[1])).toEqual(['RJ', 'RS', 'ST']);
      mockUiUtil.buildButton.mock.calls.forEach((call) => {
        expect(call[2]).toEqual(expect.any(Function));
        (call[2] as () => void)();
      });

      expect(recordJournalSpy).toHaveBeenNthCalledWith(1, JournalActionType.REJECTED);
      expect(recordJournalSpy).toHaveBeenNthCalledWith(2, JournalActionType.RESULT);
      expect(recordJournalSpy).toHaveBeenNthCalledWith(3, JournalActionType.SET);
    });
  });

});
