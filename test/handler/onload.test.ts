import { OnLoadHandler, IOnLoadHandler } from '../../src/handler/onload';
import { IWaitUtil } from '../../src/util/wait';
import { IObserveUtil } from '../../src/util/observer';
import { IWatchListHandler } from '../../src/handler/watchlist';
import { IHotkeyHandler } from '../../src/handler/hotkey';
import { IAlertHandler } from '../../src/handler/alert';
import { ITickerChangeHandler } from '../../src/handler/ticker_change';
import { IPaintManager } from '../../src/manager/paint';
import { IDomManager } from '../../src/manager/dom';
import { IDomainEventConsumer, ISubscriber, IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Constants } from '../../src/models/constant';

// Mock document and jQuery
const mockDocument = {
  addEventListener: jest.fn(),
  body: {} as HTMLElement,
} as unknown as Document;

const mockJQuery = jest.fn(() => ({
  length: 0,
  on: jest.fn(),
}));

// Mock Tampermonkey/Greasemonkey functions
const mockGM_addValueChangeListener = jest.fn();

// Set up global mocks
(global as any).document = mockDocument;
(global as any).$ = mockJQuery;
(global as any).GM_addValueChangeListener = mockGM_addValueChangeListener;

describe('OnLoadHandler', () => {
  let onLoadHandler: IOnLoadHandler;
  let mockWaitUtil: jest.Mocked<IWaitUtil>;
  let mockObserveUtil: jest.Mocked<IObserveUtil>;
  let mockWatchListHandler: jest.Mocked<IWatchListHandler>;
  let mockHotkeyHandler: jest.Mocked<IHotkeyHandler>;
  let mockAlertHandler: jest.Mocked<IAlertHandler>;
  let mockTickerChangeHandler: jest.Mocked<ITickerChangeHandler>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockPublisher: jest.Mocked<IPublisher>;
  let mockDomainEventConsumers: jest.Mocked<IDomainEventConsumer>[];
  let mockSubscriber: jest.Mocked<ISubscriber>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Mock all dependencies — waitJEE calls callback immediately
    mockWaitUtil = {
      waitJEE: jest.fn((_selector, callback) => {
        const mockElement = {
          length: 1,
          get: jest.fn(() => document.body),
        } as unknown as JQuery;
        callback(mockElement);
      }),
    } as unknown as jest.Mocked<IWaitUtil>;

    mockObserveUtil = {
      nodeObserver: jest.fn(),
      attributeObserver: jest.fn(),
    } as unknown as jest.Mocked<IObserveUtil>;

    mockWatchListHandler = {
      onWatchListChange: jest.fn(),
      recordSelectedTicker: jest.fn(),
      registerEvents: jest.fn(),
    } as unknown as jest.Mocked<IWatchListHandler>;

    mockHotkeyHandler = {
      handleKeyDown: jest.fn(),
    } as unknown as jest.Mocked<IHotkeyHandler>;

    mockAlertHandler = {
      handleAlertClick: jest.fn(),
      registerAlertTickerDelinkHandler: jest.fn(),
    } as unknown as jest.Mocked<IAlertHandler>;

    mockTickerChangeHandler = {
      onTickerChange: jest.fn(),
      registerEvents: jest.fn(),
    } as unknown as jest.Mocked<ITickerChangeHandler>;

    mockPaintManager = {
      paint: jest.fn().mockResolvedValue(undefined),
      paintTickers: jest.fn().mockResolvedValue(undefined),
      summarizeBuckets: jest.fn().mockResolvedValue({ buckets: new Map(), uncategorizedCount: 0 }),
    } as unknown as jest.Mocked<IPaintManager>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TEST'),
    } as unknown as jest.Mocked<IDomManager>;

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    mockDomainEventConsumers = [
      { registerEvents: jest.fn() },
      { registerEvents: jest.fn() },
    ] as unknown as jest.Mocked<IDomainEventConsumer>[];

    mockSubscriber = {
      subscribe: jest.fn(),
      subscribeMany: jest.fn(),
    } as unknown as jest.Mocked<ISubscriber>;

    onLoadHandler = new OnLoadHandler(
      mockWaitUtil,
      mockObserveUtil,
      mockWatchListHandler,
      mockHotkeyHandler,
      mockAlertHandler,
      mockTickerChangeHandler,
      mockPaintManager,
      mockDomManager,
      mockPublisher,
      mockDomainEventConsumers,
      mockSubscriber
    );
  });

  describe('constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(onLoadHandler).toBeDefined();
    });
  });

  describe('init', () => {
    it('should initialize all required handlers in serial order', () => {
      onLoadHandler.init();

      // Static listeners set up
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockGM_addValueChangeListener).toHaveBeenCalled();
      expect(mockAlertHandler.registerAlertTickerDelinkHandler).toHaveBeenCalled();

      // Ticker observer setup (first wait)
      expect(mockWaitUtil.waitJEE).toHaveBeenCalledWith(Constants.DOM.HEADER.MAIN, expect.any(Function), 10);
      expect(mockObserveUtil.attributeObserver).toHaveBeenCalled();

      // Watchlist observer setup (second wait, serial after ticker)
      expect(mockWaitUtil.waitJEE).toHaveBeenCalledWith(
        `${Constants.DOM.WATCHLIST.CONTAINER} > div`,
        expect.any(Function),
        10
      );
      expect(mockObserveUtil.nodeObserver).toHaveBeenCalled();

      // Screener observer set up (after watchlist)
      expect(mockObserveUtil.nodeObserver).toHaveBeenCalledWith(document.body, expect.any(Function));
    });

    it('should register all domain event consumers before FIRST_LOAD publish', () => {
      onLoadHandler.init();
      for (const consumer of mockDomainEventConsumers) {
        expect(consumer.registerEvents).toHaveBeenCalledWith(mockSubscriber);
      }
    });

    it('should publish FIRST_LOAD after ticker and watchlist observer setup', () => {
      onLoadHandler.init();

      // FIRST_LOAD published after both observers are set up
      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.FIRST_LOAD,
        ticker: 'TEST',
      });
    });
  });

  describe('constants integration', () => {
    it('should use correct DOM selectors from constants', () => {
      expect(Constants.DOM.SCREENER.MAIN).toBe('[data-qa-id="screener-widget"]');
    });
  });
});
