/**
 * Manages DOM observation operations
 */
class ObserveUtil {
    /**
     * Observes attribute changes on target
     * @param {Element} target - Target element to observe
     * @param {Function} callback - Callback for changes
     */
    attributeObserver(target, callback) {
        if (!target || !(target instanceof Element)) {
            console.error('Invalid target element provided to attributeObserver');
            return;
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
            console.error('attributeObserver error:', error);
        }
    }

    /**
     * Observes node changes on target
     * @param {Element} target - Target element to observe
     * @param {Function} callback - Callback for changes
     */
    nodeObserver(target, callback) {
        if (!target || !(target instanceof Element)) {
            console.error('Invalid target element provided to nodeObserver');
            return;
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
        }
    }
}
