import { JournalHandler } from '../../src/handler/journal';
import { IJournalManager } from '../../src/manager/journal';
import { ISmartPrompt } from '../../src/util/smart';
import { IUIUtil } from '../../src/util/ui';
import { ITradingViewManager } from '../../src/manager/tv';
import { IStyleManager } from '../../src/manager/style';
import { TickerManager } from '../../src/manager/ticker';
import { IAlertManager } from '../../src/manager/alert';
import { AlertClickAction } from '../../src/models/events';
import { JournalType } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';
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
  let mockTickerManager: jest.Mocked<TickerManager>;
  let mockJournalManager: jest.Mocked<IJournalManager>;
  let mockSmartPrompt: jest.Mocked<ISmartPrompt>;
  let mockUiUtil: jest.Mocked<IUIUtil>;
  let mockTradingViewManager: jest.Mocked<ITradingViewManager>;
  let mockStyleManager: jest.Mocked<IStyleManager>;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockDocument: { querySelector: jest.Mock; querySelectorAll: jest.Mock };
  let mockReviewLink: { addEventListener: jest.Mock };
  let mockJournalOpenListener: (
    _keyName: string,
    _oldValue: unknown,
    newValue: unknown
  ) => void;

  beforeEach(() => {
    mockTickerManager = {
      getTicker: jest.fn(),
    } as unknown as jest.Mocked<TickerManager>;

    mockJournalManager = {
      createEntry: jest.fn(),
      createReasonText: jest.fn(),
      createJournal: jest.fn(),
      publishJournalOpenEvent: jest.fn(),
      screenshotTicker: jest.fn(),
      screenshotChecklist: jest.fn(),
    } as unknown as jest.Mocked<IJournalManager>;

    mockSmartPrompt = {
      showModal: jest.fn(),
      showTextareaModal: jest.fn(),
    } as unknown as jest.Mocked<ISmartPrompt>;

    mockUiUtil = {
      toggleUI: jest.fn(),
    } as unknown as jest.Mocked<IUIUtil>;

    mockTradingViewManager = {
      clipboardCopy: jest.fn(),
      setSwiftKeysState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITradingViewManager>;

    mockStyleManager = {
      selectToolbar: jest.fn(),
    } as unknown as jest.Mocked<IStyleManager>;

    mockAlertManager = {
      createAlertClickEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAlertManager>;

    mockDocument = {
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
    };

    mockReviewLink = {
      addEventListener: jest.fn(),
    };

    (global as any).document = mockDocument;
    (global as any).Element = class {
      closest = jest.fn();
    };
    (global as any).GM_addValueChangeListener = jest.fn((_, listener) => {
      mockJournalOpenListener = listener;
    });
    (global as any).window = {
      location: {
        assign: jest.fn(),
      },
    };

    journalHandler = new JournalHandler(
      mockTickerManager,
      mockJournalManager,
      mockSmartPrompt,
      mockUiUtil,
      mockTradingViewManager,
      mockStyleManager,
      mockAlertManager
    );
  });

  describe('handleReviewJournal', () => {
    it('should publish OPEN alert-click event for current journal ticker', () => {
      mockDocument.querySelector.mockReturnValue({ textContent: 'KLAC' });

      journalHandler.handleReviewJournal();

      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith('KLAC', AlertClickAction.OPEN);
    });

    it('should skip event creation when ticker is empty', () => {
      mockDocument.querySelector.mockReturnValue({ textContent: '' });

      journalHandler.handleReviewJournal();

      expect(mockAlertManager.createAlertClickEvent).not.toHaveBeenCalled();
    });

    it('should publish OPEN alert-click event for clicked review item', () => {
      mockDocument.querySelector.mockReturnValue({ textContent: 'KLAC' });
      const clickedTicker = { textContent: 'MSFT' };
      const reviewLink = {
        querySelector: jest.fn().mockImplementation((selector: string) => (selector.includes('x-text') ? clickedTicker : null)),
      };
      const target = new (global as any).Element();
      target.closest.mockReturnValue(reviewLink);
      const event = { target } as unknown as Event;

      journalHandler.handleReviewJournal(event);

      expect(mockAlertManager.createAlertClickEvent).toHaveBeenCalledWith('MSFT', AlertClickAction.OPEN);
    });
  });

  describe('handleRecordJournal', () => {
    it('should route REJECTED journal to screenshot ticker flow', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'reason', value: 'oe' });
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_1',
        ticker: 'TCS',
        sequence: 'MWD',
        type: 'REJECTED',
        status: 'FAIL',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalType.REJECTED);

      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'rejected');
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith({
        ticker: 'TCS',
        reason: 'oe',
        type: 'REJECTED',
        status: 'FAIL',
        screenshots: [{ file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' }],
      });
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_1');
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should route SET journal to taken setup flow with required note', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      // Step 1: note
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      // Step 2: checklist screenshot
      (mockJournalManager.screenshotChecklist as jest.Mock).mockResolvedValue({
        file_name: 'TCS_20240422_0930_checklist_set.png',
        full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png',
        timeframe: 'TMN',
      });
      // Step 3: reason prompt
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'reason', value: 'oe' });
      // Step 4: full screenshots
      (mockJournalManager.screenshotTicker as jest.Mock).mockResolvedValue([
        { file_name: 'TCS_20240422_0930_1_tmn_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_1_tmn_set.png' },
      ]);
      (mockJournalManager.createJournal as jest.Mock).mockResolvedValue({
        id: 'jrn_2',
        ticker: 'TCS',
        sequence: 'MWD',
        type: 'TAKEN',
        status: 'SET',
        created_at: '2026-04-22T00:00:00Z',
      });
      (mockJournalManager.publishJournalOpenEvent as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalType.SET);

      // Verify ordering: note -> checklist -> reason -> full screenshots -> createJournal
      expect(mockSmartPrompt.showTextareaModal).toHaveBeenCalledWith(
        'Trade Setup Note',
        Constants.TRADING.PROMPT.TRADE_INFO,
        'Save Note'
      );
      expect(mockJournalManager.screenshotChecklist).toHaveBeenCalledWith('TCS', 'set');
      expect(mockSmartPrompt.showModal).toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).toHaveBeenCalledWith('TCS', 'set');
      expect(mockJournalManager.createJournal).toHaveBeenCalledWith({
        ticker: 'TCS',
        reason: 'oe',
        screenshots: [
          { file_name: 'TCS_20240422_0930_checklist_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png', timeframe: 'TMN' },
          { file_name: 'TCS_20240422_0930_1_tmn_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_1_tmn_set.png' },
        ],
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
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_2');
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when setup note popup is cancelled', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(null);

      await journalHandler.handleRecordJournal(JournalType.SET);

      expect(mockJournalManager.screenshotChecklist).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when setup note is empty', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue('   ');

      await journalHandler.handleRecordJournal(JournalType.SET);

      expect(mockJournalManager.screenshotChecklist).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when checklist region screenshot returns 409', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      (mockJournalManager.screenshotChecklist as jest.Mock).mockRejectedValue(new Error('409 Conflict: screenshot aborted'));

      await journalHandler.handleRecordJournal(JournalType.SET);

      expect(mockJournalManager.screenshotChecklist).toHaveBeenCalledWith('TCS', 'set');
      expect(Notifier.warn).toHaveBeenCalledWith('Checklist screenshot was cancelled, aborting journal creation.');
      expect(mockSmartPrompt.showModal).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should abort SET journal flow when reason prompt is cancelled after checklist screenshot', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showTextareaModal.mockResolvedValue(Constants.TRADING.PROMPT.TRADE_INFO);
      (mockJournalManager.screenshotChecklist as jest.Mock).mockResolvedValue({
        file_name: 'TCS_20240422_0930_checklist_set.png',
        full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png',
        timeframe: 'TMN',
      });
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await journalHandler.handleRecordJournal(JournalType.SET);

      expect(mockJournalManager.screenshotChecklist).toHaveBeenCalledWith('TCS', 'set');
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.publishJournalOpenEvent).not.toHaveBeenCalled();
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
    });

    it('should keep RESULT journal on legacy createEntry flow', async () => {
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'reason', value: 'oe' });
      (mockJournalManager.createEntry as jest.Mock).mockResolvedValue(undefined);

      await journalHandler.handleRecordJournal(JournalType.RESULT);

      expect(mockJournalManager.createEntry).toHaveBeenCalledWith('TCS', JournalType.RESULT, 'oe');
      expect(mockSmartPrompt.showTextareaModal).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
    });
  });

  describe('registerJournalReviewHandler', () => {
    it('should install click listener and open ticker button once', () => {
      mockDocument.querySelectorAll.mockReturnValue([mockReviewLink]);

      journalHandler.registerJournalReviewHandler();

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('a[href^="/journal/"]');
      expect(mockReviewLink.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('registerOpenJournalHandler', () => {
    it('should install journal open listener and navigate to the review page', () => {
      journalHandler.registerOpenJournalHandler();

      expect((global as any).GM_addValueChangeListener).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.JOURNAL_OPEN,
        expect.any(Function)
      );

      mockJournalOpenListener(Constants.STORAGE.EVENTS.JOURNAL_OPEN, undefined, JSON.stringify({ journalId: 'jrn_123' }));

      expect((global as any).window.location.assign).toHaveBeenCalledWith('/journal/jrn_123');
    });
  });
});
