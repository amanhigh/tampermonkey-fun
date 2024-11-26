/**
 * Manages TradingView input operations
 * @class InputManager
 */
class InputManager {
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
     * Sets focus on the input element with the specified ID.
     *
     * @return {void} 
     */
    focusCommandInput() {
        $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).focus();
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
        const swiftEnabled = this.isSwiftEnabled();
        
        if (swiftEnabled && !document.title.includes('SwiftKeys')) {
            document.title = document.title + liner;
        } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
            document.title = document.title.replace(liner, '');
        }
    }
}