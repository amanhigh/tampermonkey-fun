import { OnLoadHandler, IOnLoadHandler } from '../../src/handler/onload';
import { IWaitUtil } from '../../src/util/wait';
import { IObserveUtil } from '../../src/util/observer';
import { IWatchListHandler } from '../../src/handler/watchlist';
import { IHotkeyHandler } from '../../src/handler/hotkey';
import { IAlertHandler } from '../../src/handler/alert';
import { ITickerChangeHandler } from '../../src/handler/ticker_change';
import { IPaintManager } from '../../src/manager/paint';
import { IDomainEventConsumer, ISubscriber } from '../../src/manager/event_bus';
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
  let mockDomainEventConsumers: jest.Mocked<IDomainEventConsumer>[];
  let mockSubscriber: jest.Mocked<ISubscriber>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Mock all dependencies
    mockWaitUtil = {
      waitJEE: jest.fn((_selector, callback) => {
        // Simulate that the element is found and callback is called
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
    } as unknown as jest.Mocked<IWatchListHandler>;

    mockHotkeyHandler = {
      handleKeyDown: jest.fn(),
    } as unknown as jest.Mocked<IHotkeyHandler>;

    mockAlertHandler = {
      handleAlertClick: jest.fn(),
      refreshAlerts: jest.fn(),
      registerAlertTickerDelinkHandler: jest.fn(),
    } as unknown as jest.Mocked<IAlertHandler>;

    mockTickerChangeHandler = {
      onTickerChange: jest.fn(),
    } as unknown as jest.Mocked<ITickerChangeHandler>;

    mockPaintManager = {
      paint: jest.fn().mockResolvedValue(undefined),
      paintTickers: jest.fn().mockResolvedValue(undefined),
      summarizeBuckets: jest.fn().mockResolvedValue({ buckets: new Map(), uncategorizedCount: 0 }),
    } as unknown as jest.Mocked<IPaintManager>;

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
    it('should initialize all required handlers', () => {
      onLoadHandler.init();
      expect(mockWaitUtil.waitJEE).toHaveBeenCalled();
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockObserveUtil.nodeObserver).toHaveBeenCalledWith(expect.any(Object), expect.any(Function));
      expect(mockGM_addValueChangeListener).toHaveBeenCalled();
      expect(mockAlertHandler.registerAlertTickerDelinkHandler).toHaveBeenCalled();
    });

    it('should register all domain event consumers on init', () => {
      onLoadHandler.init();
      for (const consumer of mockDomainEventConsumers) {
        expect(consumer.registerEvents).toHaveBeenCalledWith(mockSubscriber);
      }
    });
  });

  describe('constants integration', () => {
    it('should use correct DOM selectors from constants', () => {
      expect(Constants.DOM.SCREENER.MAIN).toBe('[data-qa-id="screener-widget"]');
    });
  });
});
