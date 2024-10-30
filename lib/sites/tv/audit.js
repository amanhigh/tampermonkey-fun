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

/**
 * Class representing the UI Manager for audits.
 */
class AuditUIManager {
    /**
     * Creates an instance of AuditUIManager.
     * @param {string} auditId - The ID of the audit area in the UI.
     * @param {Set} orderSet - The set of orders to filter results.
     */
    constructor(auditId, orderSet) {
        this.auditId = auditId; // ID of the audit area in the UI
        this.orderSet = orderSet; // Injecting orderSet dependency
    }

    /********** Public Methods **********/

    /**
     * Updates the audit summary in the UI based on current results.
     */
    updateAuditSummary() {
        const filterResults = (results) => {
            return results.filter(result => !this.orderSet.containsAny(reverseMapTicker(result.ticker)));
        };

        const singleAlerts = filterResults(this.alertStore.getFilteredAuditResults(AlertState.SINGLE_ALERT));
        const noAlerts = filterResults(this.alertStore.getFilteredAuditResults(AlertState.NO_ALERTS));

        if (singleAlerts.length === 0 && noAlerts.length === 0) {
            message("No alerts to audit", "yellow");
            return;
        }

        // Clear existing audit area
        $(`#${this.auditId}`).empty();

        // Add single alert buttons
        singleAlerts.forEach(result => {
            this.createAuditButton(result.ticker, true).appendTo(`#${this.auditId}`);
        });

        // Add no-alert buttons
        noAlerts.forEach(result => {
            this.createAuditButton(result.ticker, false).appendTo(`#${this.auditId}`);
        });

        message(`Audit Refreshed: ${singleAlerts.length} Single Alerts, ${noAlerts.length} No Alerts`, 'green');
    }

    /**
     * Refreshes or creates an audit button for a ticker based on its state.
     * @param {string} ticker - The ticker symbol to refresh.
     * @param {AlertState} resultState - The current state of the ticker's alerts.
     */
    refreshAuditButton(ticker, resultState) {
        const investingTicker = mapTicker(ticker);

        // Find existing button for this ticker
        const $button = $(`#${this.getAuditButtonId(investingTicker)}`);

        // If ticker has valid alerts, remove the button if it exists
        if (resultState === AlertState.VALID) {
            $button.remove();
            return;
        }

        // Create new button with updated state
        const newButton = this.createAuditButton(
            investingTicker,
            resultState === AlertState.SINGLE_ALERT
        );

        // Replace existing button or append new one
        if ($button.length) {
            $button.replaceWith(newButton);
        } else {
            newButton.appendTo(`#${this.auditId}`);
        }

        message(`Audit Refreshed: ${ticker} -> ${investingTicker} ${resultState}`, 'green');
    }

    /********** Private Methods **********/

    /**
     * Creates an audit button for a given ticker.
     * @param {string} ticker - The ticker symbol to create a button for.
     * @param {boolean} hasSingleAlert - Indicates if there is a single alert for the ticker.
     * @returns {jQuery} The created button element.
     * @private
     */
    _createAuditButton(ticker, hasSingleAlert) {
       const buttonId = this.getAuditButtonId(ticker);
       const button = buildButton(
           buttonId,
           ticker,
           () => OpenTicker(ticker)
       ).css({
           'background-color': hasSingleAlert ? 'darkred' : 'darkgray',
           'margin': '2px'
       });

       button.on('contextmenu', (e) => {
           e.preventDefault();
           deletePairInfo(ticker);
           button.remove();
           message(`Removed mapping for ${ticker}`, 'yellow');
       });

       return button;
   }

   /**
    * Generates a unique ID for an audit button based on the ticker symbol.
    * @param {string} ticker - The ticker symbol to generate an ID for.
    * @returns {string} The generated button ID.
    * @private
    */
   _getAuditButtonId(ticker) {
       return `audit-${ticker}`.replace('/', '-');
   }
}