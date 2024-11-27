/**
 * Manages DOM operations and observations
 */
export class WaitUtil {
    /**
     * Waits for element and executes callback
     * @param selector - Element selector
     * @param callback - Callback function
     * @param count - Retry count
     * @param timeout - Timeout in ms
     */
    public waitEE(selector: string, callback: (element: HTMLElement) => void, count = 3, timeout = 2000): void {
        if (!selector || typeof selector !== 'string') {
            console.error('Invalid selector provided to waitEE');
            return;
        }

        try {
            const el = document.querySelector<HTMLElement>(selector);

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
     * @param selector - jQuery selector
     * @param callback - Callback function
     * @param count - Retry count
     * @param timeout - Timeout in ms
     */
    public waitJEE(selector: string, callback: (element: JQuery) => void, count = 3, timeout = 2000): void {
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
     * @param selector - Element selector
     * @param callback - Optional callback after click
     */
    public waitClick(selector: string, callback: () => void = () => {}): void {
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
     * @param selector - jQuery selector
     * @param callback - Optional callback after click
     */
    public waitJClick(selector: string, callback: () => void = () => {}): void {
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
     * @param selector - Element selector
     * @param inputValue - Value to input
     */
    public waitInput(selector: string, inputValue: string): void {
        if (typeof inputValue === 'undefined') {
            console.error('Input value must be provided to waitInput');
            return;
        }

        this.waitEE(selector, (e) => {
            try {
                e.value = inputValue;
                e.dispatchEvent(new Event('input', { bubbles: true }));
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
