import { JournalSyncHandler } from '../../src/handler/journal_sync';
import { IJournalManager } from '../../src/manager/journal';
import { IDomManager } from '../../src/manager/dom';
import { Constants } from '../../src/models/constant';
import { JournalOpenEvent } from '../../src/models/events';
import { TickerTimeframe } from '../../src/models/timeframe';

describe('JournalSyncHandler', () => {
  let journalSyncHandler: JournalSyncHandler;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockJournalManager: jest.Mocked<IJournalManager>;
  let mockJournalOpenListener: (
    _keyName: string,
    _oldValue: unknown,
    newValue: unknown
  ) => void;

  beforeEach(() => {
    mockDomManager = {
      openTicker: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IDomManager>;

    mockJournalManager = {
      createJournal: jest.fn(),
      getJournal: jest.fn(),
      publishJournalOpenEvent: jest.fn().mockResolvedValue(undefined),
      publishJournalOpenedEvent: jest.fn().mockResolvedValue(undefined),
      screenshotTicker: jest.fn(),
      findRunningJournal: jest.fn(),
    } as unknown as jest.Mocked<IJournalManager>;

    (global as any).GM_addValueChangeListener = jest.fn((_, listener) => {
      mockJournalOpenListener = listener;
    });
    (global as any).window = {
      location: {
        pathname: '/journal',
        assign: jest.fn(),
        replace: jest.fn(),
      },
    };

    journalSyncHandler = new JournalSyncHandler(mockJournalManager, mockDomManager);
  });

  describe('publishBarkatJournalOpen', () => {
    it('should publish the journal id parsed from the current page synchronously', () => {
      (global as any).window.location.pathname = '/journal/jrn_abc123';

      journalSyncHandler.publishBarkatJournalOpen();

      expect(mockJournalManager.publishJournalOpenedEvent).toHaveBeenCalledWith('jrn_abc123');
      expect(mockJournalManager.publishJournalOpenedEvent).toHaveBeenCalledTimes(1);
      expect(mockJournalManager.createJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.findRunningJournal).not.toHaveBeenCalled();
      expect(mockJournalManager.screenshotTicker).not.toHaveBeenCalled();
    });

    it('should not publish on the journal list page', () => {
      (global as any).window.location.pathname = '/journal';

      journalSyncHandler.publishBarkatJournalOpen();

      expect(mockJournalManager.publishJournalOpenedEvent).not.toHaveBeenCalled();
    });

    it('should not publish on unrelated paths', () => {
      (global as any).window.location.pathname = '/alerts';

      journalSyncHandler.publishBarkatJournalOpen();

      expect(mockJournalManager.publishJournalOpenedEvent).not.toHaveBeenCalled();
    });
  });

  describe('registerBarkatJournalOpenListener', () => {
    it('should fetch the journal and open its primary ticker through the DOM manager', async () => {
      mockJournalManager.getJournal.mockResolvedValue({
        id: 'jrn_abc123',
        ticker: 'NSE:KLAC',
        top_timeframe: TickerTimeframe.TMN,
        type: 'TAKEN',
        status: 'RUNNING',
        created_at: '2024-01-01T00:00:00Z',
      });

      journalSyncHandler.registerBarkatJournalOpenListener();
      mockJournalOpenListener(
        Constants.STORAGE.EVENTS.JOURNAL_OPENED,
        undefined,
        new JournalOpenEvent(' jrn_abc123 ', 1700000000000).stringify()
      );
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(mockDomManager.openTicker).toHaveBeenCalledWith('NSE:KLAC');
      expect(mockJournalManager.getJournal).toHaveBeenCalledWith('jrn_abc123');
      expect(mockJournalManager.publishJournalOpenedEvent).not.toHaveBeenCalled();
    });

    it('should skip journal fetching and ticker opening when journal id is empty', () => {
      journalSyncHandler.registerBarkatJournalOpenListener();
      mockJournalOpenListener(
        Constants.STORAGE.EVENTS.JOURNAL_OPENED,
        undefined,
        new JournalOpenEvent(' ', 1700000000000).stringify()
      );

      expect(mockJournalManager.getJournal).not.toHaveBeenCalled();
      expect(mockDomManager.openTicker).not.toHaveBeenCalled();
    });

    it('should skip a non-string journal-open payload', () => {
      journalSyncHandler.registerBarkatJournalOpenListener();
      mockJournalOpenListener(Constants.STORAGE.EVENTS.JOURNAL_OPENED, undefined, 123);

      expect(mockJournalManager.getJournal).not.toHaveBeenCalled();
      expect(mockDomManager.openTicker).not.toHaveBeenCalled();
    });

    it('should skip a malformed journal-open payload', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      journalSyncHandler.registerBarkatJournalOpenListener();
      mockJournalOpenListener(Constants.STORAGE.EVENTS.JOURNAL_OPENED, undefined, '{malformed');

      expect(warnSpy).toHaveBeenCalledWith('[JournalSync][TradingView] Ignoring malformed journalOpenedEvent value', {
        newValue: '{malformed',
      });
      expect(mockJournalManager.getJournal).not.toHaveBeenCalled();
      expect(mockDomManager.openTicker).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should not open a ticker when fetching the journal fails', async () => {
      mockJournalManager.getJournal.mockRejectedValue(new Error('API down'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      journalSyncHandler.registerBarkatJournalOpenListener();
      mockJournalOpenListener(
        Constants.STORAGE.EVENTS.JOURNAL_OPENED,
        undefined,
        new JournalOpenEvent('jrn_abc123', 1700000000000).stringify()
      );
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(mockDomManager.openTicker).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('registerTvJournalRecordedListener', () => {
    it('should install journal open listener and navigate to the review page', () => {
      journalSyncHandler.registerTvJournalRecordedListener();

      expect((global as any).GM_addValueChangeListener).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.JOURNAL_OPEN,
        expect.any(Function)
      );

      mockJournalOpenListener(Constants.STORAGE.EVENTS.JOURNAL_OPEN, undefined, JSON.stringify({ journalId: 'jrn_123' }));

      expect((global as any).window.location.replace).toHaveBeenCalledWith('/journal/jrn_123');
    });
  });
});
