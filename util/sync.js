/**
 * Manages synchronization and resource waiting operations
 */
class SyncManager {

    _waitId = 'aman-wait-on';

    constructor() {
        this._initializeSyncElement();
    }

    /**
     * Initializes the sync DOM element if not present
     * @private
     */
    _initializeSyncElement() {
        let $waitOn = $(`#${this._waitId}`);
        if (!$waitOn.length) {
            $waitOn = $('<div>')
                .attr('id', this._waitId)
                .appendTo('body');
        }
    }

    /**
     * Wait on a resource with a timeout, and execute a callback when the resource becomes available.
     * @param {string} id - The unique identifier of the resource to wait on
     * @param {number} timeout - The timeout period in milliseconds
     * @param {Function} callback - The callback function to execute when the resource becomes available
     */
    waitOn(id, timeout, callback) {
        if (!id || typeof id !== 'string') {
            console.error('Invalid id provided to waitOn');
            return;
        }

        if (!timeout || typeof timeout !== 'number') {
            console.error('Invalid timeout provided to waitOn');
            return;
        }

        if (!callback || typeof callback !== 'function') {
            console.error('Invalid callback provided to waitOn');
            return;
        }

        try {
            const mutexId = `wait-${id}`;
            const dataId = `aman-data-${id}`;
            const $waitOn = $(`#${this._waitId}`);

            if (!$waitOn.hasClass(mutexId)) {
                this._initiateMutex($waitOn, mutexId, dataId, timeout, callback);
            } else {
                this._extendTimeout($waitOn, dataId, timeout);
            }
        } catch (error) {
            console.error('waitOn error:', error);
        }
    }

    /**
     * Initiates a new mutex lock
     * @private
     */
    _initiateMutex($waitOn, mutexId, dataId, timeout, callback) {
        $waitOn.toggleClass(mutexId);
        $waitOn.data(dataId, timeout); //Start filling timeout Bucket.
        
        const waitPeriod = timeout / 2;
        this._startMutexMonitor($waitOn, mutexId, dataId, timeout, waitPeriod, callback);
    }

    /**
     * Starts monitoring the mutex
     * @private
     */
    _startMutexMonitor($waitOn, mutexId, dataId, timeout, waitPeriod, callback) {
        const monitorMutex = () => {
            const newTimeout = $waitOn.data(dataId) - waitPeriod; //Remove elapsed Time from timeout Bucket.
            $waitOn.data(dataId, newTimeout);
            // console.log('Mutex Depleted: ', id, newTimeout)
            /* Handles last element grace period to execute */
            if (newTimeout <= -timeout) {
                $waitOn.toggleClass(mutexId);
                callback();
            } else {
                setTimeout(monitorMutex, waitPeriod);
            }
        };

        setTimeout(monitorMutex, waitPeriod);
    }

    /**
     * Extends the timeout for an existing mutex
     * @private
     */
    _extendTimeout($waitOn, dataId, timeout) {
        const newTimeout = $waitOn.data(dataId) + timeout; //Add to Timeout Bucket
        $waitOn.data(dataId, newTimeout);
        // console.log('Mutex Filled: ', id, newTimeout);
    }
}
