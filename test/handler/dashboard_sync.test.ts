import { DashboardSyncHandler, IDashboardSyncHandler } from '../../src/handler/dashboard_sync';
import { IDashboardSyncManager } from '../../src/manager/dashboard_sync';
import { EventBus, ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { DashboardTickerChangedEvent } from '../../src/models/events';
import { Constants } from '../../src/models/constant';

describe('DashboardSyncHandler', () => {
  let handler: IDashboardSyncHandler;
  let mockManager: jest.Mocked<IDashboardSyncManager>;
  let subscriber: ISubscriber;
  let eventBus: EventBus;
  let mockGMListener: (
    _keyName: string,
    _oldValue: unknown,
    newValue: unknown
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    mockManager = {
      publishTickerChanged: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IDashboardSyncManager>;

    eventBus = new EventBus();
    subscriber = eventBus;

    (global as any).GM_addValueChangeListener = jest.fn((_key, listener) => {
      mockGMListener = listener;
    });
    (global as any).window = {
      location: {
        href: 'http://localhost:8050/?ticker=OLD&tf=SMN',
        replace: jest.fn(),
      },
    };

    handler = new DashboardSyncHandler(mockManager);
  });

  describe('registerEvents', () => {
    it('should subscribe to TICKER_CHANGED and delegate to manager', async () => {
      handler.registerEvents(subscriber);

      await eventBus.publish({
        type: DomainEventType.TICKER_CHANGED,
        ticker: 'RELIANCE',
      });

      expect(mockManager.publishTickerChanged).toHaveBeenCalledWith('RELIANCE');
    });
  });

  describe('registerDashyListner', () => {
    it('should register GM_addValueChangeListener for TICKER_CHANGED', () => {
      handler.registerDashyListner();

      expect(GM_addValueChangeListener).toHaveBeenCalledWith(
        Constants.STORAGE.EVENTS.TICKER_CHANGED,
        expect.any(Function)
      );
    });

    it('should parse event and replace URL when GM event fires', () => {
      const event = new DashboardTickerChangedEvent('TCS');

      handler.registerDashyListner();

      // Simulate GM event
      mockGMListener('tickerChangedEvent', null, event.stringify());

      expect(window.location.replace).toHaveBeenCalledWith(
        'http://localhost:8050/?ticker=TCS&tf=SMN'
      );
    });

    it('should not update URL for malformed JSON', () => {
      handler.registerDashyListner();

      mockGMListener('tickerChangedEvent', null, 'not-json');

      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('should not update URL for non-string values', () => {
      handler.registerDashyListner();

      mockGMListener('tickerChangedEvent', null, null);

      expect(window.location.replace).not.toHaveBeenCalled();
    });
  });
});
