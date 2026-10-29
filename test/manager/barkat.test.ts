import { BarkatManager, IBarkatManager } from '../../src/manager/barkat';
import { IBarkatClient } from '../../src/client/barkat';
import { BarkatTickerAnalysis } from '../../src/models/barkat/market/analysis';
import { Constants } from '../../src/models/shared/constant';
import { ITickerManager } from '../../src/manager/ticker';
import { IDomManager } from '../../src/manager/dom';
import { EventBus } from '../../src/manager/event_bus';
import { DomainEvent, DomainEventType } from '../../src/models/barkat/domain_event';
import { TickerArea, TickerVisibility } from '../../src/models/presentation/dom';
import { Ticker, TickerType } from '../../src/models/barkat/market/ticker';
import { Notifier } from '../../src/util/notify';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

/** Builds an equity ticker record with the native symbol as its identity. */
function makeTicker(ticker: string): Ticker {
  return new Ticker({ ticker, type: TickerType.EQUITY });
}

/** Every event that triggers a watchlist warm-up; only FIRST_LOAD carries a ticker. */
const WARMUP_EVENTS: DomainEvent[] = [
  { type: DomainEventType.FIRST_LOAD, ticker: 'AAPL' },
  { type: DomainEventType.TIMER },
];

/** The types of every warm-up event, for subscriptions that span all of them. */
const WARMUP_EVENT_TYPES = WARMUP_EVENTS.map((event) => event.type);

describe('BarkatManager', () => {
  let barkatManager: IBarkatManager;
  let mockBarkatClient: jest.Mocked<IBarkatClient>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  // The server contract owns the payload shape; the manager only passes it through.
  const analysis: BarkatTickerAnalysis = { ticker: 'BRK.B', timeframes: [] };

  beforeEach(() => {
    jest.clearAllMocks();

    mockBarkatClient = {
      getBaseUrl: jest.fn().mockReturnValue(Constants.BARKAT.BASE_URL),
      getTickerAnalysis: jest.fn(),
      warmupTickers: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IBarkatClient>;

    mockTickerManager = {
      getTicker: jest.fn(),
      updateTicker: jest.fn(),
      markRecent: jest.fn(),
      listTickers: jest.fn().mockResolvedValue([]),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    mockDomManager = {
      getTickers: jest.fn().mockReturnValue(new Set(['AAPL', 'BRK.B'])),
      getTicker: jest.fn(),
      isScreenerVisible: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    barkatManager = new BarkatManager(mockBarkatClient, mockTickerManager, mockDomManager);
  });

  describe('getTickerAnalysis', () => {
    it('should pass the ticker through and return the client result unchanged', async () => {
      mockBarkatClient.getTickerAnalysis.mockResolvedValue(analysis);

      const result = await barkatManager.getTickerAnalysis('BRK.B');

      expect(mockBarkatClient.getTickerAnalysis).toHaveBeenCalledTimes(1);
      expect(mockBarkatClient.getTickerAnalysis).toHaveBeenCalledWith('BRK.B');
      expect(result).toBe(analysis);
      // Analysis is independent of ticker metadata, the DOM and any warm-up.
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
      expect(mockDomManager.getTickers).not.toHaveBeenCalled();
      expect(mockBarkatClient.warmupTickers).not.toHaveBeenCalled();
    });

    it('should propagate client failures unchanged', async () => {
      const failure = new Error('Failed to get ticker analysis for BRK.B: 500');
      mockBarkatClient.getTickerAnalysis.mockRejectedValue(failure);

      await expect(barkatManager.getTickerAnalysis('BRK.B')).rejects.toBe(failure);
    });
  });

  describe('registerEvents', () => {
    let eventBus: EventBus;

    beforeEach(() => {
      eventBus = new EventBus();
      barkatManager.registerEvents(eventBus);
    });

    it.each(WARMUP_EVENTS)(
      'should query confirmed equities and submit only watchlist native names on $type',
      async (event) => {
        mockTickerManager.listTickers.mockResolvedValue([
          makeTicker('AAPL'),
          makeTicker('BRK.B'),
          makeTicker('AAPL'),
          makeTicker('INTC'),
          makeTicker('MSFT'),
        ]);
        mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'BRK.B', 'UNKNOWN']));

        await eventBus.publish(event);

        // The current ALL watchlist snapshot is the only membership source.
        expect(mockDomManager.getTickers).toHaveBeenCalledTimes(1);
        expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);

        expect(mockTickerManager.listTickers).toHaveBeenCalledTimes(1);
        expect(mockTickerManager.listTickers).toHaveBeenCalledWith({ type: TickerType.EQUITY });

        // Unmatched (UNKNOWN) and non-watchlist (INTC/MSFT) records are dropped and
        // the repeated AAPL metadata record is de-duplicated.
        expect(mockBarkatClient.warmupTickers).toHaveBeenCalledTimes(1);
        expect(mockBarkatClient.warmupTickers).toHaveBeenCalledWith(['AAPL', 'BRK.B']);

        // The submitted ticker count is reported to the user.
        expect(Notifier.success).toHaveBeenCalledTimes(1);
        expect(Notifier.success).toHaveBeenCalledWith('🔥 Warmed up 2 ticker(s)');
      }
    );

    it.each(WARMUP_EVENTS)(
      'should submit nothing on $type for an empty watchlist snapshot without querying metadata',
      async (event) => {
        mockDomManager.getTickers.mockReturnValue(new Set<string>());

        await eventBus.publish(event);

        expect(mockDomManager.getTickers).toHaveBeenCalledTimes(1);
        expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
        expect(mockBarkatClient.warmupTickers).not.toHaveBeenCalled();
        expect(Notifier.success).not.toHaveBeenCalled();
      }
    );

    it('should submit nothing when no equity record matches the watchlist', async () => {
      mockTickerManager.listTickers.mockResolvedValue([makeTicker('MSFT')]);
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL']));

      await eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'AAPL' });

      expect(mockTickerManager.listTickers).toHaveBeenCalledTimes(1);
      expect(mockBarkatClient.warmupTickers).not.toHaveBeenCalled();
      expect(Notifier.success).not.toHaveBeenCalled();
    });

    it('should warm up again on TIMER with an unchanged watchlist', async () => {
      mockTickerManager.listTickers.mockResolvedValue([makeTicker('AAPL')]);
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL']));

      await eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TIMER });

      // The tick re-reads and resubmits on every occurrence: no de-duplication
      // against the previous submission happens in the manager.
      expect(mockTickerManager.listTickers).toHaveBeenCalledTimes(2);
      expect(mockDomManager.getTickers).toHaveBeenCalledTimes(2);
      expect(mockBarkatClient.warmupTickers).toHaveBeenCalledTimes(2);
      expect(mockBarkatClient.warmupTickers).toHaveBeenLastCalledWith(['AAPL']);
      expect(Notifier.success).toHaveBeenCalledTimes(2);
    });

    it('should re-read the snapshot on WATCHLIST_CHANGED, ignoring the add/remove delta', async () => {
      mockTickerManager.listTickers.mockResolvedValue([
        makeTicker('AAPL'),
        makeTicker('BRK.B'),
        makeTicker('INTC'),
      ]);
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'BRK.B', 'MSFT']));

      await eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'AAPL' });
      mockBarkatClient.warmupTickers.mockClear();
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'BRK.B', 'INTC']));

      await eventBus.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        // MSFT was removed and INTC was added; the payload is the delta only.
        tickers: ['MSFT', 'INTC'],
      });

      // Only the freshly read DOM snapshot is forwarded, never the event delta.
      expect(mockBarkatClient.warmupTickers).toHaveBeenCalledTimes(1);
      expect(mockBarkatClient.warmupTickers).toHaveBeenCalledWith(['AAPL', 'BRK.B', 'INTC']);
      expect(mockBarkatClient.warmupTickers).not.toHaveBeenCalledWith(['MSFT', 'INTC']);
      expect(Notifier.success).toHaveBeenLastCalledWith('🔥 Warmed up 3 ticker(s)');
    });

    it('should not warm up on chart, category, timeframe or other ticker events', async () => {
      await eventBus.publish({ type: DomainEventType.TICKER_TIMEFRAMES_CHANGED, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TICKER_CHANGED, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TICKER_TRACKING_STARTED, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TICKER_TRACKING_STOPPED, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TICKER_METADATA_CHANGED, ticker: 'AAPL' });
      await eventBus.publish({ type: DomainEventType.TICKER_CATEGORY_CHANGED, tickers: ['AAPL'] });

      expect(mockDomManager.getTickers).not.toHaveBeenCalled();
      expect(mockTickerManager.listTickers).not.toHaveBeenCalled();
      expect(mockBarkatClient.warmupTickers).not.toHaveBeenCalled();
    });

    it.each(
      WARMUP_EVENTS.flatMap((event) =>
        [
          { stage: 'metadata', expectedFirstSubmissionCount: 0 },
          { stage: 'submission', expectedFirstSubmissionCount: 1 },
        ].map(({ stage, expectedFirstSubmissionCount }) => ({
          event,
          stage,
          expectedFirstSubmissionCount,
        }))
      )
    )(
      'should log $stage failures on $event.type, keep resolving and allow a later event to succeed',
      async ({ event, stage, expectedFirstSubmissionCount }) => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        // A sibling consumer of every warm-up event must never be affected by a warm-up rejection.
        const refreshStub = jest.fn().mockResolvedValue(undefined);
        eventBus.subscribeMany(WARMUP_EVENT_TYPES, refreshStub);

        try {
          mockTickerManager.listTickers.mockResolvedValue([makeTicker('AAPL')]);
          if (stage === 'metadata') {
            mockTickerManager.listTickers.mockRejectedValueOnce(new Error('tickers unavailable'));
          } else {
            mockBarkatClient.warmupTickers.mockRejectedValueOnce(new Error('Failed to warm up tickers: AAPL'));
          }

          await expect(eventBus.publish(event)).resolves.toBeUndefined();

          // Other subscribers for the same event are unaffected by the rejection.
          expect(refreshStub).toHaveBeenCalledTimes(1);
          expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(event.type), expect.any(Error));
          expect(mockBarkatClient.warmupTickers).toHaveBeenCalledTimes(expectedFirstSubmissionCount);
          // A failed warm-up reports nothing to the user.
          expect(Notifier.success).not.toHaveBeenCalled();

          await expect(eventBus.publish(event)).resolves.toBeUndefined();

          expect(refreshStub).toHaveBeenCalledTimes(2);
          expect(mockBarkatClient.warmupTickers).toHaveBeenCalledTimes(expectedFirstSubmissionCount + 1);
          expect(mockBarkatClient.warmupTickers).toHaveBeenLastCalledWith(['AAPL']);
          expect(Notifier.success).toHaveBeenCalledWith('🔥 Warmed up 1 ticker(s)');
        } finally {
          consoleError.mockRestore();
        }
      }
    );
  });
});
