/**
 * Class representing the Factory.
 * Responsible for creating instances of other classes.
 */
class Factory {
    static _instances = {};

    /**
     * Constats Holder
     * @returns {Constants} The constants instance.
     */
    static get constants() {
        return Constants;
    }

    /**
     * Creates an instance of AuditManager.
     * @returns {AuditManager} A new instance of AuditManager.
     */
    static auditManager() {
        return this._getInstance('auditManager', () => {
            const alertStore = this.alertStore();
            const uiManager = this.auditUIManager();
            return new AuditManager(alertStore, uiManager);
        });
    }

    /**
     * Creates an instance of AuditUIManager.
     * @returns {AuditUIManager} A new instance of AuditUIManager.
     */
    static auditUIManager() {
        return this._getInstance('auditUIManager', () => {
            const auditId = this.constants.AREAS.AUDIT_ID; // Retrieve audit ID from constants
            const orderSet = this.orderSet(); // Retrieve order set
            new AuditUIManager(auditId, orderSet)
        });
    }

    /**
     * Creates an instance of AlertManager.
     * @returns {AlertManager} A new instance of AlertManager.
     */
    static alertManager() {
        return this._getInstance('alertManager', () => {
            const alertStore = this.alertStore();
            const uiManager = this.alertUIManager();
            const manager = new AlertManager(alertStore, uiManager);
            
            return manager;
        });
    }

    /**
     * Creates an instance of AlertUIManager.
     * @returns {AlertUIManager} A new instance of AlertUIManager.
     */
    static alertUIManager() {
        return this._getInstance('alertUIManager', () => {
            const alertsId = this.constants.AREAS.ALERTS_ID;
            return new AlertUIManager(alertsId);
        });
    }

    /**
     * Creates or retrieves the Order Set instance.
     * @returns {Set} The order set instance.
     */
    static orderSet() {
        return this._getInstance('orderSet', () => new Set()); // Example: creating a new Set
    }

    static alertStore() {
        return this._getInstance('alertStore', () => new AlertStore()); // Example: creating a new AlertStore
    }

    static _getInstance(key, creator) {
        if (!this._instances[key]) {
            try {
                this._instances[key] = creator();
            } catch (error) {
                console.error(`Error creating instance for ${key}:`, error);
                throw error; // Rethrow to handle it further up if needed
            }
        }
        return this._instances[key];
    }
}