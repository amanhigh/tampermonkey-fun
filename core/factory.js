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

    /**
     * Creates or retrieves the RepoCron instance
     * @returns {RepoCron} The RepoCron instance
     */
    static repoCron() {
        return this._getInstance('repoCron', () => new RepoCron());
    }

    /**
     * Creates or retrieves the AlertRepo instance
     * @returns {AlertRepo} The AlertRepo instance
     */
    static alertRepo() {
        return this._getInstance('alertRepo', () => {
            const repoCron = this.repoCron();
            return new AlertRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the AuditRepo instance
     * @returns {AuditRepo} The AuditRepo instance
     */
    static auditRepo() {
        return this._getInstance('auditRepo', () => {
            const repoCron = this.repoCron();
            return new AuditRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the ExchangeRepo instance
     * @returns {ExchangeRepo} The ExchangeRepo instance
     */
    static exchangeRepo() {
        return this._getInstance('exchangeRepo', () => {
            const repoCron = this.repoCron();
            return new ExchangeRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the FlagRepo instance
     * @returns {FlagRepo} The FlagRepo instance
     */
    static flagRepo() {
        return this._getInstance('flagRepo', () => {
            const repoCron = this.repoCron();
            return new FlagRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the OrderRepo instance
     * @returns {OrderRepo} The OrderRepo instance
     */
    static orderRepo() {
        return this._getInstance('orderRepo', () => {
            const repoCron = this.repoCron();
            return new OrderRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the PairRepo instance
     * @returns {PairRepo} The PairRepo instance
     */
    static pairRepo() {
        return this._getInstance('pairRepo', () => {
            const repoCron = this.repoCron();
            return new PairRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the RecentTickerRepo instance
     * @returns {RecentTickerRepo} The RecentTickerRepo instance
     */
    static recentTickerRepo() {
        return this._getInstance('recentTickerRepo', () => {
            const repoCron = this.repoCron();
            return new RecentTickerRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the SequenceRepo instance
     * @returns {SequenceRepo} The SequenceRepo instance
     */
    static sequenceRepo() {
        return this._getInstance('sequenceRepo', () => {
            const repoCron = this.repoCron();
            return new SequenceRepo(repoCron);
        });
    }

    /**
     * Creates or retrieves the TickerRepo instance
     * @returns {TickerRepo} The TickerRepo instance
     */
    static tickerRepo() {
        return this._getInstance('tickerRepo', () => {
            const repoCron = this.repoCron();
            return new TickerRepo(repoCron);
        });
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