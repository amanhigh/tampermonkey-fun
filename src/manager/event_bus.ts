import { DomainEvent } from '../models/domain_event';

/**
 * Type alias for a handler function that processes a domain event.
 * Can be async or synchronous.
 */
export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

/**
 * Interface for publishing domain events.
 * Producers (managers) depend on this narrow interface
 * instead of the full IEventBus to avoid accidental subscribe.
 */
export interface IPublisher {
  /**
   * Publish a domain event. All subscribed handlers for the event type
   * are invoked concurrently. Errors from individual handlers are caught
   * and logged; other handlers are not affected.
   * @param event - The domain event to publish
   */
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Interface for subscribing to domain events.
 * Subscribers (handlers) depend on this narrow interface
 * to avoid accidental publish.
 */
export interface ISubscriber {
  /**
   * Subscribe a handler to a specific domain event type.
   * @param type - The event type to subscribe to
   * @param handler - The handler function
   */
  subscribe<T extends DomainEvent['type']>(
    type: T,
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>
  ): void;

  /**
   * Subscribe the same handler to multiple event types.
   * Useful when different events share the same payload shape and reaction.
   * @param types - Array of event types to subscribe to
   * @param handler - The handler function called for each matching event
   */
  subscribeMany<T extends DomainEvent['type']>(
    types: T[],
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>
  ): void;
}

/**
 * Combined event bus interface — convenience for the composition root only.
 * Publishers depend on IPublisher, subscribers depend on ISubscriber.
 */
export interface IEventBus extends IPublisher, ISubscriber {}

/**
 * Interface for components that consume domain events.
 * Implementing classes register their subscriptions in this method.
 */
export interface IDomainEventConsumer {
  /**
   * Register event subscriptions with the given subscriber interface.
   * Called once during app initialization.
   * @param subscriber - The subscriber interface to subscribe with
   */
  registerEvents(subscriber: ISubscriber): void;
}

/**
 * In-process domain event bus implementation.
 *
 * Threading model:
 * - Handlers run concurrently via Promise.all.
 * - A failing handler does not block other handlers.
 * - publish() resolves when all handlers have completed.
 */
export class EventBus implements IPublisher, ISubscriber {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  /** @inheritdoc */
  subscribe<T extends DomainEvent['type']>(
    type: T,
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>
  ): void {
    const existing = this.handlers.get(type);
    if (existing) {
      existing.push(handler as DomainEventHandler);
    } else {
      this.handlers.set(type, [handler as DomainEventHandler]);
    }
  }

  /** @inheritdoc */
  subscribeMany<T extends DomainEvent['type']>(
    types: T[],
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>
  ): void {
    types.forEach((type) => {
      this.subscribe(type, handler);
    });
  }

  /** @inheritdoc */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    if (handlers.length === 0) {
      return;
    }

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler for ${event.type} failed:`, error);
        }
      })
    );
  }
}
