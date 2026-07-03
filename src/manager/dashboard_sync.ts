import { Constants } from '../models/constant';
import { DashboardTickerChangedEvent } from '../models/events';

/**
 * Interface for managing cross-site dashboard synchronization.
 * Handles GM.setValue emission (TradingView side).
 */
export interface IDashboardSyncManager {
  /**
   * Publishes a ticker-changed event to GM storage.
   * Called on TradingView when ticker changes, so the localhost
   * dashboard can pick it up via GM_addValueChangeListener.
   * @param ticker - The new ticker symbol
   */
  publishTickerChanged(ticker: string): Promise<void>;
}

/**
 * Manages cross-site dashboard synchronization via GM storage.
 *
 * On TradingView, publishes ticker changes to GM storage.
 */
export class DashboardSyncManager implements IDashboardSyncManager {
  /** @inheritdoc */
  public async publishTickerChanged(ticker: string): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.TICKER_CHANGED, new DashboardTickerChangedEvent(ticker).stringify());
  }
}
