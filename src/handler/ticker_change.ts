import { IDomManager } from '../manager/dom';
import { IRecentManager } from '../manager/recent';
import { ISyncUtil } from '../util/sync';
import { IDomainEventConsumer, ISubscriber } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';
import { Constants } from '../models/constant';

export interface ITickerChangeHandler extends IDomainEventConsumer {
  onTickerChange(): void;
}

/**
 * Handles ticker change events from the DOM observer.
 *
 * Delegates to RecentManager which publishes TICKER_CHANGED.
 * All other consumers (Display, TimeFrame, AlertSummary, etc.)
 * react to that domain event.
 *
 * Also subscribes to FIRST_LOAD to mark the initial ticker as recent
 * and trigger the first render cascade.
 */
export class TickerChangeHandler implements ITickerChangeHandler {
  constructor(
    private readonly domManager: IDomManager,
    private readonly recentManager: IRecentManager,
    private readonly syncUtil: ISyncUtil
  ) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    subscriber.subscribe(DomainEventType.FIRST_LOAD, (event) => {
      this.recentManager.markRecent(event.ticker);
    });
  }

  public onTickerChange(): void {
    this.syncUtil.waitOn(Constants.DOM_EVENTS.TICKER_CHANGE, 150, () => {
      const tvTicker = this.domManager.getTicker();
      this.recentManager.markRecent(tvTicker);
    });
  }
}
