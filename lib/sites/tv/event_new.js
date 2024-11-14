/**
 * Core event management system for handling application events
 */
class EventManager {
    constructor() {
        this.handlers = new Map();
    }

    registerHandler(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
    }

    unregisterHandler(eventType, handler) {
        if (this.handlers.has(eventType)) {
            this.handlers.get(eventType).delete(handler);
        }
    }

    emit(eventType, data) {
        if (this.handlers.has(eventType)) {
            this.handlers.get(eventType).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in handler for ${eventType}:`, error);
                }
            });
        }
    }
}

/**
 * Handles all ticker-related events and state management
 */
class TickerHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('tickerChange', this.onTickerChange.bind(this));
        this.eventManager.registerHandler('recentTickerReset', this.onRecentTickerReset.bind(this));
    }

    onTickerChange() {
        //HACK: Make Event Based when New Ticker Appears
        waitOn("tickerChange", 150, () => {
            AlertRefreshLocal();

            // Fetch Orders and update summary
            const gttOrderMap = GttOrderMap.loadFromGMValue(gttOrderEvent);
            gttSummary(gttOrderMap);

            // Update UI
            paintName();

            // Handle recent ticker functionality
            this._handleRecentTicker();

            // Display sequence
            displaySequence();
        });
    }

    onRecentTickerReset() {
        const recentEnabled = $(`#${recentId}`).prop('checked');
        
        if (recentEnabled) {
            message('Recent Enabled', 'green');
        } else {
            dataSilo.clearRecentTickers();
            paintScreener();
            paintAlertFeedEvent();
            message('Recent Disabled', 'red');
        }
    }

    _handleRecentTicker() {
        const recentEnabled = $(`#${recentId}`).prop('checked');
        const ticker = getTicker();
        
        if (recentEnabled && !dataSilo.isRecentTicker(ticker)) {
            dataSilo.addRecentTickers(ticker);
            paintScreener();
            paintAlertFeedEvent();
        }
    }
}

/**
 * Handles all watchlist-related events and updates
 */
class WatchListHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('watchListChange', this.onWatchListChange.bind(this));
    }

    onWatchListChange() {
        waitOn("watchListChangeEvent", 2, () => {
            // Reset and update watchlist state
            this._resetWatchListState();
            
            // Update UI components
            this._updateUIComponents();
            
            // Apply filters
            this._applyFilters();
        });
    }

    _resetWatchListState() {
        resetWatchList();
        updateWatchListSet();
    }

    _updateUIComponents() {
        paintWatchList();
        paintScreener();
        paintName();
        paintAlertFeedEvent();
    }

    _applyFilters() {
        filterChain.forEach((f) => FilterWatchList(f));
    }
}

/**
 * Handles button-related events and actions
 */
class ButtonHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('refreshButton', this.HandleRefreshButton.bind(this));
        this.eventManager.registerHandler('alertButton', this.HandleAlertButton.bind(this));
        this.eventManager.registerHandler('journalButton', this.HandleJournalButton.bind(this));
        this.eventManager.registerHandler('sequenceSwitch', this.HandleSequenceSwitch.bind(this));
    }

    HandleRefreshButton() {
        // Refersh Ticker
        this.eventManager.emit('tickerChange');

        // Refresh alerts
        ForceRefreshAlerts();

        // Handle order set cleanup
        this._handleOrderSetCleanup();
    }

    HandleAlertButton(e) {
        if (e.ctrlKey) {
            // Map current exchange to current TV ticker
            pinExchangeTicker(getTicker(), getExchange());
        } else {
            createHighAlert();
        }
    }

    /**
     * Handles the journal button toggle event
     * @param {Event} e - The event object
     */
    HandleJournalButton(e) {
        this._toggleJournalUI();
    }

    /**
     * Handles the sequence switch event
     * @param {Event} e - The event object
     */
    HandleSequenceSwitch(e) {
        const currentTicker = getTicker();
        
        // Pin the sequence for the current ticker
        this._pinSequenceForTicker(currentTicker);
        
        // Update the sequence display
        this._updateSequenceDisplay();
    }

    /**
     * Handles the alert context menu event
     * @param {Event} e - The context menu event object
     */
    HandleAlertContextMenu(e) {
        // Prevent default context menu
        e.preventDefault();

        // Trigger ticker refresh and audit
        this._refreshAndAuditTicker();
    }
    
    // Private helper methods

    _refreshAndAuditTicker() {
        // Emit ticker change event
        this.eventManager.emit('tickerChange');

        // Perform audit
        AuditCurrentTicker();
    }
    
    _toggleJournalUI() {
        toggleUI(`#${journalId}`);
    }

    _pinSequenceForTicker(ticker) {
        pinSequence(ticker);
    }

    _updateSequenceDisplay() {
        displaySequence();
    }

    _handleOrderSetCleanup() {
        // Perform dry run to get potential deletion count
        const dryRunCount = orderSet.dryRunClean();

        //Clean Order Set after unfilter completes
        setTimeout(() => {
            if (dryRunCount < 5) {
                // Auto update if deletion count is less than 5
                const cleanCount = orderSet.clean();
                orderSet.save();
            } else {
                // Prompt user for confirmation if deletion count is 5 or more
                const confirmDeletion = confirm(
                    `Potential Deletions: ${dryRunCount}. Proceed with cleanup?`
                );
                
                if (confirmDeletion) {
                    const cleanCount = orderSet.clean();
                    orderSet.save();
                } else {
                    message("Cleanup aborted by user.", 'red');
                }
            }
        }, 1000);
    }
}


/**
 * Enhanced UIManager with toolbar-specific operations
 */
class UIManager {
    constructor() {
        this.elementCache = new Map();
    }

    toggleElement(elementId) {
        const element = this._getElement(elementId);
        if (element) {
            element.toggle();
        }
    }

    _getElement(elementId) {
        if (!this.elementCache.has(elementId)) {
            const element = $(`#${elementId}`);
            if (element.length) {
                this.elementCache.set(elementId, element);
            }
        }
        return this.elementCache.get(elementId);
    }

     /**
     * Selects a UI element by selector and index
     * @param {string} selector - The CSS selector
     * @param {number} index - The index to select
     * @returns {boolean} - Success status of the operation
     */
     selectElementByIndex(selector, index) {
        try {
            const element = $(`${selector}:nth(${index})`);
            if (element.length) {
                element.click();
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error selecting element: ${selector}[${index}]`, error);
            return false;
        }
    }

    /**
     * Selects a timeframe element
     * @param {number} index - The timeframe index
     * @returns {boolean} - Success status of the operation
     */
    selectTimeframe(index) {
        return this.selectElementByIndex(ToolbarConstants.TIMEFRAME_SELECTOR, index);
    }

    /**
     * Selects a toolbar element
     * @param {number} index - The toolbar index
     * @returns {boolean} - Success status of the operation
     */
    selectToolbar(index) {
        return this.selectElementByIndex(ToolbarConstants.TOOLBAR_SELECTOR, index);
    }
}

/**
 * Handles all input-related events and validations
 */
class InputHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.ENTER_KEY_CODE = 13;
        this.TICKER_SUFFIX = "xox";
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('inputChange', this.onInputChange.bind(this));
        this.eventManager.registerHandler('inputSubmit', this.HandleInputSubmit.bind(this));
    }

    /**
     * Handles changes in input value
     * @param {jQuery.Event} event - The input change event
     */
    onInputChange(event) {
        const inputValue = $(event.target).val();
        
        // HACK: Improved Ends With Symbol
        if (this._hasTickerSuffix(inputValue)) {
            //Open Ticker in InputBox (Pasted from Clipboard)
            const ticker = this._extractTickerFromInput(inputValue);
            this._openTickerAndClear(ticker);
        }
    }

    /**
     * Handles input submission events
     * @param {KeyboardEvent} e - The keyboard event object
     */
    HandleInputSubmit(e) {
        if (this._isEnterKey(e)) {
            this._processTextAction();
        }
    }

    /**
     * Handles price submission events
     * @param {KeyboardEvent} e - The keyboard event object
     */
    HandlePriceSubmit(e) {
        if (this._isEnterKey(e)) {
            this._handleTextBoxCreateAlert();
        }
    }
    
    // Private helper methods

    _handleTextBoxCreateAlert() {
        HandleTextBoxCreateAlert();
    }


    _hasTickerSuffix(value) {
        return value.endsWith(this.TICKER_SUFFIX);
    }

    _extractTickerFromInput(value) {
        return value.substring(0, value.length - this.TICKER_SUFFIX.length);
    }

    _openTickerAndClear(ticker) {
        OpenTicker(ticker);
        this._clearInputFields();
    }

    _isEnterKey(e) {
        return e.keyCode === this.ENTER_KEY_CODE;
    }

    _processTextAction() {
        processTextAction();
    }

    _clearInputFields() {
        clearFields();
    }
}

------

/**
 * Handles all toolbar and timeframe related operations
 */
class ToolbarHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('timeframeSelect', this.SelectTimeframe.bind(this));
        this.eventManager.registerHandler('toolbarSelect', this.SelectToolbar.bind(this));
    }

    /**
     * Selects timeframe based on the provided index
     * @param {number} timeFrameIndex - Index of the timeframe to select
     */
    SelectTimeframe(timeFrameIndex) {
        const timeFrame = this._getTimeFrame(timeFrameIndex);
        this._selectTimeframeElement(timeFrame.index);
    }

    /**
     * Selects toolbar based on the provided index
     * @param {number} index - Index of the toolbar to select
     */
    SelectToolbar(index) {
        this._selectToolbarElement(index);
    }

    /**
     * Applies style based on timeframe and zone type
     * @param {ZoneType} zoneType - The type of zone to apply (DEMAND/SUPPLY)
     */
    SelectTimeFrameStyle(zoneType) {
        // Combine the timeframe-specific style with the zone type symbol and apply it
        const styleToApply = `${timeFrame.style}${zoneType.symbol}`;
        this._applyStyle(styleToApply);
    }

    /**
     * Applies a specific style by name
     * @param {string} styleName - Name of the style to apply
     */
    Style(styleName) {
        this._applyStyle(styleName);
    }

    // Private helper methods

    _applyStyle(styleName) {
        waitClick(ToolbarConstants.STYLE_SELECTOR, () => {
            waitJClick(`${ToolbarConstants.STYLE_ITEM_SELECTOR}:contains(${styleName})`);
        });
    }

    _getTimeFrame(timeFrameIndex) {
        return getTimeFrame(timeFrameIndex);
    }

    _selectTimeframeElement(index) {
        $(`${ToolbarConstants.TIMEFRAME_SELECTOR}:nth-child(${index})`).click();
    }

    _selectToolbarElement(index) {
        $(`${ToolbarConstants.TOOLBAR_SELECTOR}:nth(${index})`).click();
    }
}

/**
 * Constants for toolbar operations
 */
// TODO: Inject constants.
const ToolbarConstants = {
    TIMEFRAME_SELECTOR: '.timeframe-button',
    TOOLBAR_SELECTOR: '.toolbar-item',
    STYLE_SELECTOR: '.floating-toolbar-react-widgets button',
    STYLE_ITEM_SELECTOR: '.tv-floating-toolbar__popup div',
    SAVE_SELECTOR: '.header-toolbar-save-load',
    ZONE_TYPES: {
        DEMAND: { symbol: 'DZ' },
        SUPPLY: { symbol: 'SZ' }
    }
};

/**
 * Handles background tasks and automated operations
 */
class CronManager {
    constructor(eventManager, uiManager) {
        this.eventManager = eventManager;
        this.uiManager = uiManager;
        
        // Replay state
        this.replayCron = null;
        this.runReplay = false;
        
        // Constants
        this.SAVE_INTERVAL = 30 * 1000;    // 30 seconds
        this.REPLAY_INTERVAL = 2 * 1000;   // 2 seconds
        
        this.setupCrons();
    }

    setupCrons() {
        // Setup auto-save cron
        setInterval(() => this.cronSave(), this.SAVE_INTERVAL);
        
        // Setup event listeners for replay
        this.eventManager.registerHandler('autoSave', this.cronSave.bind(this));
        this.eventManager.registerHandler('replayToggle', this.toggleReplay.bind(this));
    }

    cronSave() {
        try {
            this._performSave();
            this._notifySaveSuccess();
        } catch (error) {
            this._handleSaveError(error);
        }
    }

    cronReplay() {
        if (!this._isReplayActive()) {
            this._stopReplayCron();
            return;
        }

        try {
            const playPauseElement = $(ReplayConstants.REPLAY_PLAY_PAUSE_SELECTOR);
            const replayRunning = this._isReplayRunning(playPauseElement);

            if (this.runReplay !== replayRunning) {
                this._toggleReplayState(playPauseElement);
            }
        } catch (error) {
            this._handleReplayError(error);
        }
    }

    toggleReplay() {
        if (!this.replayCron) {
            this._startReplayCron();
        }

        this.runReplay = !this.runReplay;
        this._notifyReplayStateChange();
    }

    // Private methods for save operations
    _performSave() {
        $(ToolbarConstants.SAVE_SELECTOR).click();
        dataSilo.save();
        pairSilo.save();
    }

    _notifySaveSuccess() {
        message("Auto Saving", ReplayConstants.COLORS.SUCCESS);
    }

    _handleSaveError(error) {
        console.error('Auto save failed:', error);
        message("Auto Save Failed", ReplayConstants.COLORS.ERROR);
    }

    // Private methods for replay operations
    _isReplayActive() {
        const isActive = $(ReplayConstants.REPLAY_ACTIVE_SELECTOR).length > 0;
        if (!isActive) {
            this._stopReplayCron();
            message("Replay Cron Stopped", ReplayConstants.COLORS.INFO);
        }
        return isActive;
    }

    _isReplayRunning(playPauseElement) {
        const pathElement = playPauseElement.find('svg > path');
        return !pathElement.attr('d').includes('m10.997');
    }

    _toggleReplayState(playPauseElement) {
        try {
            playPauseElement.click();
        } catch (error) {
            console.error('Failed to toggle replay state:', error);
            this._stopReplayCron();
        }
    }

    _startReplayCron() {
        if (this.replayCron) {
            return;
        }

        this.replayCron = setInterval(() => {
            this.cronReplay();
        }, this.REPLAY_INTERVAL);

        message("Replay Cron Started", ReplayConstants.COLORS.INFO);
    }

    _stopReplayCron() {
        if (this.replayCron) {
            clearInterval(this.replayCron);
            this.replayCron = null;
        }
    }

    _notifyReplayStateChange() {
        const state = this.runReplay ? 
            ReplayConstants.STATES.ENTERING : 
            ReplayConstants.STATES.EXITING;
        const color = this.runReplay ? 
            ReplayConstants.COLORS.SUCCESS : 
            ReplayConstants.COLORS.WARNING;
        
        message(`${state} Replay Mode`, color);
    }

    _handleReplayError(error) {
        console.error('Replay error:', error);
        message("Replay Error Occurred", ReplayConstants.COLORS.ERROR);
        this._stopReplayCron();
    }
}

/**
 * Constants for replay-related operations
 */
const ReplayConstants = {
    REPLAY_ACTIVE_SELECTOR: '.replay-active',
    REPLAY_PLAY_PAUSE_SELECTOR: '.replay-controls__play-pause',
    REPLAY_INTERVAL: 2000,
    STATES: {
        ENTERING: 'Entering',
        EXITING: 'Exiting'
    },
    COLORS: {
        SUCCESS: 'green',
        WARNING: 'yellow',
        ERROR: 'red',
        INFO: 'orange'
    }
};