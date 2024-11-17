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
