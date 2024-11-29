import { Alert } from "../models/alert";
import { IRepoCron } from "./cron";
import { MapRepo, IMapRepo } from "./map";
import { SerializedData } from "./base";
import { AlertClicked } from "../models/events";
import { Constants } from "../models/constant";

/**
 * Interface for alert repository operations
 */
export interface IAlertRepo extends IMapRepo<string, Alert[]> {
    /**
     * Add alert for pair ID
     * @param pairId Pair identifier
     * @param alert Alert object
     * @throws Error if alert is invalid
     */
    addAlert(pairId: string, alert: Alert): void;

    /**
     * Get alerts sorted by price for pair ID
     * @param pairId Pair identifier
     * @returns Sorted array of alerts
     */
    getSortedAlerts(pairId: string): Alert[];

    /**
     * Remove alert by pair ID and alert ID
     * @param pairId Pair identifier
     * @param alertId Alert identifier
     */
    removeAlert(pairId: string, alertId: string): void;

    /**
     * Check if pair has any alerts
     * @param pairId Pair identifier
     * @returns True if pair has alerts
     */
    hasAlerts(pairId: string): boolean;

    /**
     * Get total number of alerts across all pairs
     * @returns Total alert count
     */
    getAlertCount(): number;

    /**
     * Create and store an alert click event
     * @param event AlertClicked event to store
     * @returns Promise resolving after event is stored
     */
    createAlertClickEvent(event: AlertClicked): Promise<void>;
}

/**
 * Repository for managing trading alerts
 */
export class AlertRepo extends MapRepo<string, Alert[]> implements IAlertRepo {
    /**
     * Creates a new alert repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "alertRepo");
    }

    /**
     * @protected
     * @param data Raw storage data
     * @returns Map of alerts
     */
    protected _deserialize(data: SerializedData): Map<string, Alert[]> {
        const alertMap = new Map<string, Alert[]>();
        Object.entries(data).forEach(([pairId, alerts]) => {
            const alertArray = alerts as Array<{ pairId: string; price: number; id: string }>;
            alertMap.set(pairId, alertArray.map(alert => 
                new Alert(alert.id,alert.pairId, alert.price)
            ));
        });
        return alertMap;
    }

    /**
     * Add alert for pair ID
     * @param pairId Pair identifier
     * @param alert Alert object
     * @throws Error if alert is invalid
     */
    public addAlert(pairId: string, alert: Alert): void {
        if (!alert || !alert.price || !alert.pairId) {
            throw new Error('Invalid alert object');
        }
        const alerts = this.get(pairId) || [];
        alerts.push(alert);
        this.set(pairId, alerts);
    }

    /**
     * Get alerts sorted by price for pair ID
     * @param pairId Pair identifier
     * @returns Sorted array of alerts
     */
    public getSortedAlerts(pairId: string): Alert[] {
        const alerts = this.get(pairId) || [];
        return [...alerts].sort((a, b) => a.price - b.price);
    }

    /**
     * Remove alert by pair ID and alert ID
     * @param pairId Pair identifier
     * @param alertId Alert identifier
     */
    public removeAlert(pairId: string, alertId: string): void {
        const alerts = this.get(pairId) || [];
        const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
        this.set(pairId, filteredAlerts);
    }

    /**
     * Check if pair has any alerts
     * @param pairId Pair identifier
     * @returns True if pair has alerts
     */
    public hasAlerts(pairId: string): boolean {
        return this.has(pairId) && (this.get(pairId)?.length ?? 0) > 0;
    }

    /**
     * Get total number of alerts across all pairs
     * @returns Total alert count
     */
    public getAlertCount(): number {
        let count = 0;
        this._map.forEach(alerts => count += alerts.length);
        return count;
    }

    /**
     * Create and store an alert click event
     * @param event AlertClicked event to store
     * @returns Promise resolving after event is stored
     */
    public async createAlertClickEvent(event: AlertClicked): Promise<void> {
        await GM.setValue(Constants.STORAGE.EVENTS.ALERT_CLICKED, event.stringify());
    }
}
