import { IDashboardSyncManager } from '../manager/dashboard_sync';
import { DashboardTickerChangedEvent } from '../models/events';
import { ISubscriber, IDomainEventConsumer } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';
import { Constants } from '../models/constant';

/**
 * Interface for handling dashboard synchronization.
 *
 * On TradingView, subscribes to TICKER_CHANGED and emits GM events.
 * On localhost dashboard, registers a GM listener to update the URL.
 */
export interface IDashboardSyncHandler extends IDomainEventConsumer {
  /**
   * Registers a GM_addValueChangeListener on the localhost dashboard
   * to detect ticker changes from TradingView and update the page URL.
   */
  registerDashyListner(): void;
}

/**
 * Handles cross-site dashboard synchronization via GM storage.
 *
 * Two sites, two roles:
 * 1. TradingView → subscribes to EventBus TICKER_CHANGED → GM.setValue
 * 2. localhost:8050 → GM_addValueChangeListener → URL replace
 */
export class DashboardSyncHandler implements IDashboardSyncHandler {
  constructor(private readonly dashboardSyncManager: IDashboardSyncManager) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    // On TradingView, bridge EventBus TICKER_CHANGED to GM storage
    subscriber.subscribe(DomainEventType.TICKER_CHANGED, async (event) => {
      await this.dashboardSyncManager.publishTickerChanged(event.ticker);
    });
  }

  /** @inheritdoc */
  registerDashyListner(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.TICKER_CHANGED,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (newValue && typeof newValue === 'string') {
          const parsed = this.parseTickerChanged(newValue);
          if (parsed) {
            const newUrl = this.buildDashboardUrl(window.location.href, parsed.ticker);
            window.location.replace(newUrl);
          }
        }
      }
    );
  }

  /**
   * Safely parse a GM storage value into a DashboardTickerChangedEvent.
   * @param value - Raw value from GM_addValueChangeListener
   * @returns Parsed event or null if parsing fails
   */
  private parseTickerChanged(value: string): DashboardTickerChangedEvent | null {
    try {
      return DashboardTickerChangedEvent.fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Build a dashboard URL by replacing the ticker query param while
   * preserving all other query params (e.g. tf=SMN).
   * @param currentHref - The current page href
   * @param ticker - The new ticker symbol
   * @returns Updated URL string
   */
  private buildDashboardUrl(currentHref: string, ticker: string): string {
    try {
      const url = new URL(currentHref);
      url.searchParams.set('ticker', ticker);
      return url.toString();
    } catch {
      // Fallback: if URL parsing fails, just return the href unchanged
      return currentHref;
    }
  }
}
