import { Constants } from '../models/constant';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { IDomainEventConsumer, IPublisher, ISubscriber } from './event_bus';

/** Interval between timer ticks in milliseconds. */
const TICK_INTERVAL_MS = 60000;

/**
 * Publishes a payload-free TIMER event once per minute and saves the TradingView
 * workspace on every tick.
 *
 * The interval starts on FIRST_LOAD, so no tick is emitted before the
 * application is initialized. Repeated FIRST_LOAD events reuse the existing
 * interval instead of creating a second one.
 */
export class TimerManager implements IDomainEventConsumer {
  /** Active interval handle; null when the timer is not running. */
  private handle: ReturnType<typeof setInterval> | null = null;

  /**
   * Creates an instance of TimerManager.
   * @param publisher - Publisher used to emit TIMER events
   */
  constructor(private readonly publisher: IPublisher) {}

  /** @inheritdoc */
  public registerEvents(subscriber: ISubscriber): void {
    subscriber.subscribe(DomainEventType.FIRST_LOAD, () => {
      this.start();
    });
    subscriber.subscribe(DomainEventType.TIMER, () => {
      this.autoSave();
    });
  }

  /**
   * Starts the recurring tick, guarded so only one interval ever exists.
   * The first tick fires one interval after the start, not immediately.
   */
  private start(): void {
    if (this.handle !== null) {
      return;
    }

    this.handle = setInterval(() => {
      void this.publisher.publish({ type: DomainEventType.TIMER });
    }, TICK_INTERVAL_MS);
  }

  /**
   * Saves the workspace and notifies the user
   */
  private autoSave(): void {
    this.clickSaveButton();
    Notifier.success('Workspace saved');
  }

  /**
   * Clicks the TradingView save button when it is present
   */
  private clickSaveButton(): void {
    const $save = $(Constants.DOM.HEADER.SAVE);
    if ($save.length) {
      $save.click();
    }
  }
}
