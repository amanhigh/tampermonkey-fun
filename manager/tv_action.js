/**
 * Manages TradingView UI actions and interactions
 */
class TradingViewActionManager {
    /**
     * @param {WaitUtil} waitUtil - DOM operation manager
     * @param {TradingViewManager} tvManager - Trading view manager
     */
    constructor(waitUtil, tvManager) {
        this.waitUtil = waitUtil;
        this.tvManager = tvManager;
    }

    /**
     * Execute ReasonPrompt function which disables SwiftKeys, prompts for reasons,
     * and enables SwiftKeys after the prompt.
     *
     * @param {function} callback - The callback function to be executed with the reason returned from SmartPrompt
     * @return {void} 
     */
    reasonPrompt(callback) {
        //Disable SwiftKeys
        this.toggleSwiftKeys(false);

        //Prompt
        SmartPrompt(Constants.TRADING.PROMPT.REASONS, Constants.TRADING.PROMPT.OVERRIDES).then((reason) => {
            callback(reason);

            //Enable SwiftKeys
            this.toggleSwiftKeys(true);
        });
    }

    /**
     * Copies the given text to the clipboard and displays a message.
     *
     * @param {string} text - The text to be copied to the clipboard
     * @return {undefined} 
     */
    clipboardCopy(text) {
        GM_setClipboard(text);
        this.message(`ClipCopy: ${text}`, 'yellow');
    }

    /**
     * Function to clear all items.
     */
    clearAll() {
        this.waitUtil.waitJClick(Constants.DOM.SIDEBAR.DELETE_ARROW, () => {
            this.waitUtil.waitJClick(Constants.DOM.SIDEBAR.DELETE_DRAWING);
        });
    }

    /**
     * Sets focus on the input element with the specified ID.
     *
     * @return {void} 
     */
    focusCommandInput() {
        $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).focus();
    }

    /**
     * Opens Current Ticker Relative to Benchmark.
     * Eg. Stock to Nifty, Crypto to Bitcoin etc
     */
    openBenchmarkTicker() {
        const ticker = this.tvManager.getTicker();
        const exchange = this.tvManager.getExchange();
        
        let benchmark;
        switch (exchange) {
            case 'MCX':
                benchmark = 'MCX:GOLD1!';
                break;
            case Constants.EXCHANGE.TYPES.NSE:
                benchmark = 'NIFTY';
                break;
            case 'BINANCE':
                benchmark = 'BINANCE:BTCUSDT';
                break;
            default:
                benchmark = 'XAUUSD';
        }
        
        this.tvManager.openTicker(`${ticker}/${benchmark}`);
    }

    /**
     * Toggles the flag and updates watchlist
     */
    toggleFlag() {
        this.waitUtil.waitJClick(Constants.DOM.FLAGS.SYMBOL);
        this.tvManager.onWatchListChange();
    }

    /**
     * Closes the text box dialog
     */
    closeTextBox() {
        this.waitUtil.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
    }

    /**
     * Gets current swift key state
     * @returns {boolean} True if swift keys are enabled
     */
    isSwiftEnabled() {
        return $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
    }

    /**
     * Title Change to Bridge witH AHK
     */
    enableSwiftKey() {
        const liner = ' - SwiftKeys';
        const swiftEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
        
        if (swiftEnabled && !document.title.includes('SwiftKeys')) {
            document.title = document.title + liner;
        } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
            document.title = document.title.replace(liner, '');
        }
    }

    /**
     * Displays a message with the given text and color
     * @param {string} text - The message text
     * @param {string} color - The message color
     */
    message(text, color) {
        console.log(`%c${text}`, `color:${color};`);
    }

    /**
     * Selects a toolbar item by index
     * @param {number} index - The toolbar index (0-based)
     * @returns {boolean} True if selection was successful
     * @throws {Error} If index is invalid
     */
    selectToolbar(index) {
        try {
            // Validate index range
            if (index < 0 || index > 10) {
                throw new Error(`Invalid toolbar index: ${index}`);
            }

            const toolbar = $(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
            if (toolbar.length === 0) {
                return false;
            }

            toolbar.click();
            return true;
        } catch (error) {
            console.error('Error selecting toolbar:', error);
            return false;
        }
    }
}
