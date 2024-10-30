/**
 * Class representing the Factory.
 * Responsible for creating instances of other classes.
 */
class Factory {
    static _instances = {};

    // Constants for this Application
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
        const auditId = this.constants.AUDIT.ID; // Retrieve audit ID from constants
        const orderSet = this.orderSet(); // Retrieve order set
        return this._getInstance('auditUIManager', () => 
            new AuditUIManager(auditId, orderSet)
        );
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
            this._instances[key] = creator();
        }
        return this._instances[key];
    }
}