// Audit - Alerts

/**
 * @fileOverview
 * This module contains the AuditManager and AuditUIManager classes.
 * These classes demonstrate how to organize code files according to best practices.
 *
 * Principles:
 * 1. **Single Responsibility Principle**: Each class should have one reason to change. 
 *    - AuditManager handles auditing logic.
 *    - AuditUIManager manages UI interactions related to auditing.
 *
 * 2. **Method Organization**:
 *    - Public methods should be clearly separated from private methods using highlighted comments.
 *    - Public methods should be documented with JSDoc annotations.
 *    - Private methods should start with an underscore (_) to indicate their intended visibility.
 *
 * 3. **Dependency Injection**:
 *    - All external dependencies (e.g., alertStore, orderSet) should be injected into classes via constructors.
 *    - Global variables should be avoided to enhance modularity and testability.
 *
 * This structure promotes maintainability, readability, and scalability of the codebase.
 */

/**
 * Class representing the Audit Manager.
 */
class AuditManager {
    /**
     * Creates an instance of AuditManager.
     * @param {Object} alertStore - The store for managing alerts.
     * @param {AuditUIManager} uiManager - The instance of UI manager for audit operations.
     */
    constructor(alertStore, uiManager) {
        this.alertStore = alertStore; // Injecting alertStore dependency
        this.uiManager = uiManager; // Injecting UI manager dependency
        this.currentIndex = 0;
        this.batchSize = 50;
    }

    /********** Public Methods **********/

    /**
     * Initiates the auditing process for all alerts.
     */
    auditAlerts() {
        this.alertStore.clearAuditResults();
        const tickers = this.getAllAlertTickers();
        this.currentIndex = 0;
        this._processBatch(tickers);
    }

    /**
     * Audits the current ticker and updates its state.
     */
    auditCurrentTicker() {
        const ticker = this.getMappedTicker();
        const state = this._auditTickerAlerts(ticker);
        this.alertStore.addAuditResult(ticker, state);
        this.uiManager.refreshAuditButton(ticker, state);
    }

    /********** Private Methods **********/

    /**
     * Processes batches of tickers for auditing.
     * @param {Array} tickers - The list of tickers to process.
     * @private
     */
    _processBatch(tickers) {
        const endIndex = Math.min(this.currentIndex + this.batchSize, tickers.length);

        for (let i = this.currentIndex; i < endIndex; i++) {
            const ticker = tickers[i];
            const state = this._auditTickerAlerts(ticker);
            this.alertStore.addAuditResult(ticker, state);
        }

        this.currentIndex = endIndex;
        if (this.currentIndex < tickers.length) {
            requestAnimationFrame(() => this._processBatch(tickers));
        } else {
            message(`Audited ${this.alertStore.getAuditResultsCount()} tickers`, 'green');
            this.uiManager.updateAuditSummary(); // No need to pass orderSet anymore
        }
    }

    /**
     * Audits alerts for a single ticker.
     * @param {string} ticker - The ticker to audit.
     * @returns {AlertState} The audit state for the ticker.
     * @private
     */
    _auditTickerAlerts(ticker) {
        const pairInfo = mapInvestingPair(ticker);
        if (!pairInfo) {
            return AlertState.NO_ALERTS;
        }

        const alerts = this.alertStore.getAlerts(pairInfo.pairId);
        return alerts.length === 0 ? AlertState.NO_ALERTS :
            alerts.length === 1 ? AlertState.SINGLE_ALERT :
                AlertState.VALID;
    }
}