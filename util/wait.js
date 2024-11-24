/**
 * Manages DOM operations and observations
 */
class WaitUtil {
    /**
     * Waits for element and executes callback
     * @param {string} selector - Element selector
     * @param {Function} callback - Callback function
     * @param {number} [count=3] - Retry count
     * @param {number} [timeout=2000] - Timeout in ms
     */
    waitEE(selector, callback, count = 3, timeout = 2000) {
        if (!selector || typeof selector !== 'string') {
            console.error('Invalid selector provided to waitEE');
            return;
        }

        try {
            const el = document.querySelector(selector);

            if (el) {
                return callback(el);
            }

            if (count > 0) {
                setTimeout(() => this.waitEE(selector, callback, count - 1, timeout), timeout);
            } else {
                console.log("Wait Element Failed, exiting Recursion: " + selector);
            }
        } catch (error) {
            console.error(`waitEE error for selector ${selector}:`, error);
        }
    }

    /**
     * Waits for jQuery element and executes callback
     * @param {string} selector - jQuery selector
     * @param {Function} callback - Callback function
     * @param {number} [count=3] - Retry count
     * @param {number} [timeout=2000] - Timeout in ms
     */
    waitJEE(selector, callback, count = 3, timeout = 2000) {
        if (!selector || typeof selector !== 'string') {
            console.error('Invalid selector provided to waitJEE');
            return;
        }

        try {
            const el = $(selector);

            if (el.length) {
                return callback(el);
            }

            if (count > 0) {
                setTimeout(() => this.waitJEE(selector, callback, count - 1, timeout), timeout);
            } else {
                console.log("Jquery Wait Element Failed, exiting Recursion: " + selector);
            }
        } catch (error) {
            console.error(`waitJEE error for selector ${selector}:`, error);
        }
    }

    /**
     * Waits for element and triggers click
     * @param {string} selector - Element selector
     * @param {Function} [callback] - Optional callback after click
     */
    waitClick(selector, callback = () => {}) {
        this.waitEE(selector, (e) => {
            try {
                e.click();
                callback();
            } catch (error) {
                console.error(`waitClick error for selector ${selector}:`, error);
            }
        });
    }

    /**
     * Waits for jQuery element and triggers click
     * @param {string} selector - jQuery selector
     * @param {Function} [callback] - Optional callback after click
     */
    waitJClick(selector, callback = () => {}) {
        this.waitJEE(selector, (e) => {
            try {
                e.click();
                callback();
            } catch (error) {
                console.error(`waitJClick error for selector ${selector}:`, error);
            }
        }, 3, 20);
    }

    /**
     * Waits for element and sends input with enter key
     * @param {string} selector - Element selector
     * @param {string} inputValue - Value to input
     */
    waitInput(selector, inputValue) {
        if (typeof inputValue === 'undefined') {
            console.error('Input value must be provided to waitInput');
            return;
        }

        this.waitEE(selector, (e) => {
            try {
                e.value = inputValue;
                e.dispatchEvent(new Event('input', { 'bubbles': true }));
                e.dispatchEvent(new KeyboardEvent("keydown", { 
                    bubbles: true, 
                    keyCode: 13 
                }));
            } catch (error) {
                console.error(`waitInput error for selector ${selector}:`, error);
            }
        }, 6, 5);
    }
}