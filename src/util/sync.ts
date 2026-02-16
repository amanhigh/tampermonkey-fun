/**
 * Interface for synchronization and resource waiting operations
 */
export interface ISyncUtil {
  /**
   * Wait on a resource with a timeout, and execute a callback when the resource becomes available.
   * @param id - The unique identifier of the resource to wait on
   * @param timeout - The timeout period in milliseconds
   * @param callback - The callback function to execute when the resource becomes available
   */
  waitOn(id: string, timeout: number, callback: () => void): void;
}

/**
 * Provides utility functions for synchronization and resource waiting operations
 */
export class SyncUtil implements ISyncUtil {
  private readonly waitId: string = 'aman-wait-on';

  constructor() {
    this.initSyncElement();
  }

  /**
   * Initializes the sync DOM element if not present
   * @private
   */
  private initSyncElement(): void {
    let $waitOn = $(`#${this.waitId}`);
    if (!$waitOn.length) {
      $waitOn = $('<div>').attr('id', this.waitId).appendTo('body');
    }
  }

  /** @inheritdoc */
  public waitOn(id: string, timeout: number, callback: () => void): void {
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
      const $waitOn = $(`#${this.waitId}`);

      if (!$waitOn.hasClass(mutexId)) {
        this.initiateMutex($waitOn, mutexId, dataId, timeout, callback);
      } else {
        this.extendTimeout($waitOn, dataId, timeout);
      }
    } catch (error) {
      console.error('waitOn error:', error);
    }
  }

  /**
   * Initiates a new mutex lock
   * @private
   */
  private initiateMutex($waitOn: JQuery, mutexId: string, dataId: string, timeout: number, callback: () => void): void {
    $waitOn.toggleClass(mutexId);
    $waitOn.data(dataId, timeout); //Start filling timeout Bucket.

    const waitPeriod = timeout / 2;
    this.startMutexMonitor($waitOn, mutexId, dataId, timeout, waitPeriod, callback);
  }

  /**
   * Starts monitoring the mutex
   * @private
   */
  private startMutexMonitor(
    $waitOn: JQuery,
    mutexId: string,
    dataId: string,
    timeout: number,
    waitPeriod: number,
    callback: () => void
  ): void {
    const monitorMutex = (): void => {
      const newTimeout = $waitOn.data(dataId) - waitPeriod; //Remove elapsed Time from timeout Bucket.
      $waitOn.data(dataId, newTimeout);
      // console.debug('Mutex Depleted: ', id, newTimeout)

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
  private extendTimeout($waitOn: JQuery, dataId: string, timeout: number): void {
    const newTimeout = ($waitOn.data(dataId) as number) + timeout; //Add to Timeout Bucket
    $waitOn.data(dataId, newTimeout);
    // console.debug('Mutex Filled: ', id, newTimeout);
  }
}
