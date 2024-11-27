/**
 * Manages DOM observation operations
 */
export class ObserveUtil {
    /**
     * Observes attribute changes on target
     * @param target - Target element to observe
     * @param callback - Callback for changes
     * @returns MutationObserver instance or undefined if setup fails
     */
    public attributeObserver(target: Element, callback: () => void): MutationObserver | undefined {
        if (!target || !(target instanceof Element)) {
            console.error('Invalid target element provided to attributeObserver');
            return undefined;
        }

        try {
            const observer = new MutationObserver((mutations) => {
                if (mutations.length > 0) {
                    callback();
                }
            });

            observer.observe(target, {
                subtree: true,
                attributes: true,
                characterData: true
            });

            return observer;
        } catch (error) {
            // TODO: Throw Error instead of logging.
            console.error('attributeObserver error:', error);
            return undefined;
        }
    }

    /**
     * Observes node changes on target
     * @param target - Target element to observe
     * @param callback - Callback for changes
     * @returns MutationObserver instance or undefined if setup fails
     */
    public nodeObserver(target: Element, callback: () => void): MutationObserver | undefined {
        if (!target || !(target instanceof Element)) {
            console.error('Invalid target element provided to nodeObserver');
            return undefined;
        }

        try {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && 
                        (mutation.addedNodes.length || mutation.removedNodes.length)) {
                        callback();
                    }
                });
            });

            observer.observe(target, {
                childList: true
            });

            // Later, you can stop observing
            //observer.disconnect();

            return observer;
        } catch (error) {
            console.error('nodeObserver error:', error);
            // TODO: Throw Error instead of logging.
            return undefined;
        }
    }
}
