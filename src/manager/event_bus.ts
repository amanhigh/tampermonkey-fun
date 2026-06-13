import { DomainEvent } from '../models/domain_event';

/**
 * Type alias for a handler function that processes a domain event.
 * Can be async or synchronous.
 */
export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void;

/**
 * Interface for the in-process event bus.
 * Handlers subscribe to specific event types;
 * publishers fire events and all matching handlers run.
 */
export interface IEventBus {
  /**
   * Publish a domain event. All subscribed handlers for the event type
   * are invoked concurrently. Errors from individual handlers are caught
   * and logged; other handlers are not affected.
   * @param event - The domain event to publish
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Subscribe a handler to a specific domain event type.
   * @param type - The event type to subscribe to
   * @param handler - The handler function
   */
  subscribe<T extends DomainEvent['type']>(
    type: T,
    handler: DomainEventHandler<Extract<DomainEvent, { type: T }>>
  ): void;
}

/**
 * Interface for components that consume domain events.
 * Implementing classes register their subscriptions in this method.
 */
export interface IDomainEventConsumer {
  /**
   * Register domain event subscriptions with the given event bus.
   * Called once during app initialization.
   * @param eventBus - The event bus to subscribe to
   */
  registerDomainEvents(eventBus: IEventBus): void;
}

/**
 * In-process domain event bus implementation.
 *
 * Threading model:
 * - Handlers run concurrently via Promise.all.
 * - A failing handler does not block other handlers.
 * - publish() resolves when all handlers have completed.
 */
export class EventBus implements IEventBus {
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
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    if (handlers.length === 0) {
      return;
    }

    await Promise.all(
      handlers.map((handler) =>
        (async () => {
          try {
            await handler(event);
          } catch (error) {
            console.error(
              `[EventBus] Handler for ${event.type} failed:`,
              error
            );
          }
        })()
      )
    );
  }
}
