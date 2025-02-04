import { Constants } from '../models/constant';
import { GttCreateEvent, GttDeleteEvent, GttRefreshEvent } from '../models/kite';

/**
 * Interface for Kite repository operations
 */
export interface IKiteRepo {
  /**
   * Create event for new GTT order
   * @param event GTT order creation event
   * @returns Promise resolving after event is stored
   */
  createGttOrderEvent(event: GttCreateEvent): Promise<void>;

  /**
   * Create GTT delete event
   * @param event GTT delete event
   * @returns Promise resolving after event is stored
   */
  createGttDeleteEvent(event: GttDeleteEvent): Promise<void>;

  /**
   * Create GTT refresh event for active orders
   * @param event GTT order refresh event
   * @returns Promise resolving after event is stored
   */
  createGttRefreshEvent(event: GttRefreshEvent): Promise<void>;

  getGttRefereshEvent(): Promise<GttRefreshEvent>;
}

/**
 * Repository for managing Kite GTT events
 */
export class KiteRepo implements IKiteRepo {
  public async createGttDeleteEvent(event: GttDeleteEvent): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.GTT_DELETE, event.stringify());
  }
  /**
   * Create event for new GTT order
   * @param event GTT order creation event
   * @returns Promise resolving after event is stored
   */
  public async createGttOrderEvent(event: GttCreateEvent): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.GTT_CREATE, event.stringify());
  }

  /**
   * Create GTT refresh event for active orders
   * @param event GTT order refresh event
   * @returns Promise resolving after event is stored
   */
  public async createGttRefreshEvent(event: GttRefreshEvent): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.GTT_REFERSH, event.stringify());
  }

  public async getGttRefereshEvent(): Promise<GttRefreshEvent> {
    const data = await GM.getValue(Constants.STORAGE.EVENTS.GTT_REFERSH);
    if (!data) {
      throw new Error('No GTT Orders Found');
    }
    return GttRefreshEvent.fromString(data.toString());
  }
}
