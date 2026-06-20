/**
 * API error with HTTP status information.
 * Thrown by BaseClient on non-2xx responses so higher layers
 * can detect specific status codes without string matching.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly responseText: string;

  constructor(status: number, statusText: string, responseText: string) {
    super(`${status} ${statusText}: ${responseText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.responseText = responseText;
  }

  /**
   * Check if the given error (or any wrapped cause) is an ApiError with 404 status.
   * Unwraps through common wrapper patterns so callers can detect back-end not-found
   * even when client methods wrap the original ApiError with their own message.
   */
  public static isNotFoundError(error: unknown): boolean {
    let current: Error | undefined = error instanceof Error ? error : undefined;
    while (current) {
      if (current instanceof ApiError && current.status === 404) {
        return true;
      }
      // Unwrap through common wrapper patterns
      const c = current as ErrorWithApiCause;
      if (c.cause instanceof Error) {
        current = c.cause;
      } else if (c.apiError instanceof ApiError) {
        current = c.apiError;
      } else {
        break;
      }
    }
    // Fallback string check for edge cases where ApiError was stringified
    if (current instanceof Error && /\b404\b/.test(current.message)) {
      return true;
    }
    return false;
  }
}

/**
 * Extended error that carries an optional ApiError as the underlying cause.
 * Used by wrapClientError to preserve the original API error through
 * client wrapper methods.
 */
interface ErrorWithApiCause extends Error {
  apiError?: ApiError;
  cause?: Error;
}

/**
 * Wrap an error with a contextual prefix while preserving the original
 * error's type information. If the original is an ApiError it is stored
 * as `apiError` on the wrapper so isApiNotFoundError can detect it.
 */
export function wrapClientError(error: unknown, prefix: string): Error {
  const err = new Error(`${prefix}: ${(error as Error).message}`);
  if (error instanceof ApiError) {
    (err as ErrorWithApiCause).apiError = error;
  }
  return err;
}
