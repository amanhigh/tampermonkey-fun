// -- Interactions

/**
 * Execute ReasonPrompt function which disables SwiftKeys, prompts for reasons,
 * and enables SwiftKeys after the prompt.
 *
 * @param {function} callback - The callback function to be executed with the reason returned from SmartPrompt
 * @return {void} 
 */
function ReasonPrompt(callback) {
    //Disable SwiftKeys
    toggleSwiftKeys(false);

    //Prompt
    SmartPrompt(reasons, overrides).then((reason) => {
        callback(reason);

        //Enable SwiftKeys
        toggleSwiftKeys(true);
    });
}

/**
 * Copies the given text to the clipboard and displays a message.
 *
 * @param {string} text - The text to be copied to the clipboard
 * @return {undefined} 
 */
function ClipboardCopy(text) {
    GM_setClipboard(text);
    message(`ClipCopy: ${text}`, 'yellow')
}

// -- Others

/**
 * Function to clear all items.
 */
function ClearAll() {
    waitJClick(deleteArrowSelector, () => {
        waitJClick(deleteDrawingSelector)
    })
}

/**
 * Sets focus on the input element with the specified ID.
 *
 * @param {string} inputId - The ID of the input element to focus on
 * @return {void} 
 */
function focusInput() {
    $(`#${inputId}`).focus();
}
