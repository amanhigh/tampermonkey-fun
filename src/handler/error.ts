/**
 * Interface for handling global application errors
 */
export interface IGlobalErrorHandler {
  /**
   * Registers global error handlers for both sync and async errors
   */
  registerGlobalErrorHandlers(): void;
}

/**
 * Handles application-wide error handling and notifications
 */
import { Notifier } from '../util/notify';

export class GlobalErrorHandler implements IGlobalErrorHandler {
  /**
   * Handles synchronous errors
   * @private
   */
  private handleSyncError(
    evt: Event | string,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    console.debug('Error:', evt, source, lineno, colno, error);
    if (evt instanceof ErrorEvent && evt.error instanceof Error) {
      Notifier.error(evt.error.message);
    }
    return false;
  }

  /**
   * Handles unhandled Promise rejections
   * @private
   */
  private handleAsyncError(event: PromiseRejectionEvent): void {
    console.debug('Unhandled Promise Rejection:', event);
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    Notifier.error(error.message);
  }

  /**
   * Registers global error handlers for both sync and async errors
   */
  public registerGlobalErrorHandlers(): void {
    // For synchronous errors
    window.onerror = this.handleSyncError;

    // For unhandled Promise rejections
    window.onunhandledrejection = this.handleAsyncError;
  }
}
