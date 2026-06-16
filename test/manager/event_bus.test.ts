import { EventBus } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('subscribe and publish', () => {
    it('should call subscribed handler for matching event type', async () => {
      const handler = jest.fn();
      eventBus.subscribe(DomainEventType.ALERT_TICKER_LINKED, handler);

      await eventBus.publish({
        type: DomainEventType.ALERT_TICKER_LINKED,
        ticker: 'TV:INFY',
        alertTicker: 'INFY',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_LINKED,
        ticker: 'TV:INFY',
        alertTicker: 'INFY',
      });
    });

    it('should call all handlers subscribed to the same event type', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      eventBus.subscribe(DomainEventType.ALERT_TICKER_LINKED, handler1);
      eventBus.subscribe(DomainEventType.ALERT_TICKER_LINKED, handler2);

      await eventBus.publish({
        type: DomainEventType.ALERT_TICKER_LINKED,
        ticker: 'TV:TCS',
        alertTicker: 'TCS',
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not call handlers for other event types', async () => {
      const handler = jest.fn();
      eventBus.subscribe(DomainEventType.ALERT_TICKER_LINKED, handler);

      await eventBus.publish({
        type: DomainEventType.TICKER_CHANGED,
        ticker: 'TV:INFY',
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should await async handlers', async () => {
      let resolved = false;
      eventBus.subscribe(DomainEventType.TICKER_CHANGED, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        resolved = true;
      });

      await eventBus.publish({
        type: DomainEventType.TICKER_CHANGED,
        ticker: 'TV:INFY',
      });

      expect(resolved).toBe(true);
    });
  });

  describe('subscribeMany', () => {
    it('should call the handler for every matching event type', async () => {
      const handler = jest.fn();
      eventBus.subscribeMany(
        [DomainEventType.ALERT_TICKER_LINKED, DomainEventType.TICKER_CHANGED],
        handler
      );

      await eventBus.publish({
        type: DomainEventType.ALERT_TICKER_LINKED,
        ticker: 'TV:INFY',
        alertTicker: 'INFY',
      });

      expect(handler).toHaveBeenCalledTimes(1);

      await eventBus.publish({
        type: DomainEventType.TICKER_CHANGED,
        ticker: 'TV:TCS',
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });
});
