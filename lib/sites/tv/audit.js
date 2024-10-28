// Audit - Alerts

/**
 * Audits all alerts in batches and Updates Summary
 */
function AuditAlerts() {
    alertStore.clearAuditResults();
    const tickers = getAllAlertTickers();
    const batchSize = 50;
    let currentIndex = 0;

    function processBatch() {
        const endIndex = Math.min(currentIndex + batchSize, tickers.length);

        for (let i = currentIndex; i < endIndex; i++) {
            const ticker = tickers[i];
            const state = auditTickerAlerts(ticker);
            alertStore.addAuditResult(ticker, state);
        }

        currentIndex = endIndex;
        if (currentIndex < tickers.length) {
            requestAnimationFrame(processBatch);
        } else {
            message(`Audited ${alertStore.getAuditResultsCount()} tickers`, 'green');
            updateAuditSummary();
        }
    }

    requestAnimationFrame(processBatch);
}

/**
 * Audits alerts for a single ticker
 * @param {string} ticker The ticker to audit
 * @returns {AlertState} The audit state for the ticker
 */
function auditTickerAlerts(ticker) {
    const pairInfo = mapInvestingPair(ticker);
    if (!pairInfo) {
        return AlertState.NO_ALERTS;
    }

    const alerts = alertStore.getAlerts(pairInfo.pairId);
    return alerts.length === 0 ? AlertState.NO_ALERTS :
        alerts.length === 1 ? AlertState.SINGLE_ALERT :
            AlertState.VALID;
}

/**
 * Audits the current ticker
 */
function AuditCurrentTicker() {
    const ticker = getMappedTicker();
    const state = auditTickerAlerts(ticker);
    alertStore.addAuditResult(ticker, state);
    refreshAuditButton();
}

/**
 * Shows audit results in the audit area using buttons
 * @param {number} [batchSize=10] Number of alerts to show at once
 */
function updateAuditSummary(batchSize = 10) {
    // Filter out tickers that are in orderSet
    const filterResults = (results) => {
        return results.filter(result => !orderSet.containsAny(reverseMapTicker(result.ticker)));
    };

    const singleAlerts = filterResults(alertStore.getFilteredAuditResults(AlertState.SINGLE_ALERT));
    const noAlerts = filterResults(alertStore.getFilteredAuditResults(AlertState.NO_ALERTS));

    if (singleAlerts.length === 0 && noAlerts.length === 0) {
        message("No alerts to audit", "yellow");
        return;
    }

    // Clear existing audit area
    $(`#${auditId}`).empty();

    // Add single alert buttons
    singleAlerts.slice(0, batchSize).forEach(result => {
        createAuditButton(result.ticker, true).appendTo(`#${auditId}`);
    });

    // Add no-alert buttons
    noAlerts.slice(0, batchSize).forEach(result => {
        createAuditButton(result.ticker, false).appendTo(`#${auditId}`);
    });

    message(`Audit Refreshed: ${singleAlerts.length} Single Alerts, ${noAlerts.length} No Alerts`, 'green');
}

/**
 * Refreshes or creates audit button for current ticker based on latest audit state
 */
function refreshAuditButton() {
    const ticker = getTicker();

    // No Refresh if ticker is in orderSet
    if (orderSet.containsAny(reverseMapTicker(ticker))) {
        return;
    }

    const investingTicker = mapTicker(ticker);
    const result = alertStore.getAuditResult(investingTicker);

    if (!result) return;

    // Find existing button for this ticker
    const $button = $(`#${getAuditButtonId(investingTicker)}`);

    // If ticker has valid alerts, remove the button if it exists
    if (result.state === AlertState.VALID) {
        $button.remove();
        return;
    }

    // Create new button with updated state
    const newButton = createAuditButton(
        investingTicker,
        result.state === AlertState.SINGLE_ALERT
    );

    // Replace existing button or append new one
    if ($button.length) {
        $button.replaceWith(newButton);
    } else {
        newButton.appendTo(`#${auditId}`);
    }

    message(`Audit Refreshed: ${ticker} -> ${investingTicker} ${result.state}`, 'green');
}

/**
 * Creates a button for an audited ticker
 * @param {string} ticker The ticker symbol
 * @param {boolean} hasSingleAlert Whether the ticker has a single alert
 * @returns {jQuery} The created button element
 */
function createAuditButton(ticker, hasSingleAlert) {
    const buttonId = getAuditButtonId(ticker);
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
 * Generates a unique ID for an audit button based on the ticker
 * @param {string} ticker The ticker symbol
 * @returns {string} The generated button ID
 */
function getAuditButtonId(ticker) {
    return `audit-${ticker}`.replace('/', '-');
}