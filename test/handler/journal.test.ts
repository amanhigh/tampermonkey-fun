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
    } as unknown as jest.Mocked<IJournalManager>;

    mockSmartPrompt = {
      showModal: jest.fn(),
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
        screenshots: [{ file_name: 'TCS.tmn.rejected_20240422_0930.png', full_path: '/home/aman/Downloads/TCS.tmn.rejected_20240422_0930.png' }],
      });
      expect(mockJournalManager.publishJournalOpenEvent).toHaveBeenCalledWith('jrn_1');
      expect(mockJournalManager.createEntry).not.toHaveBeenCalled();
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
