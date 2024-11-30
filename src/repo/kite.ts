import { Constants } from "../models/constant";
import { GttCreateEvent, GttRefreshEvent } from "../models/kite";

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
     * Create GTT refresh event for active orders
     * @param event GTT order refresh event
     * @returns Promise resolving after event is stored
     */
    createGttRefreshEvent(event: GttRefreshEvent): Promise<void>;
}

/**
 * Repository for managing Kite GTT events
 */
export class KiteRepo implements IKiteRepo {
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
}
