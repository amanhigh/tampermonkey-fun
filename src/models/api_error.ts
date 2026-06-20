/**
 * API error with HTTP status information.
 * Thrown by BaseClient on non-2xx responses so higher layers
 * can detect specific status codes without string matching.
 */
export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /**
   * Check if the given error (or any wrapped cause) is an ApiError with 404 status.
   * Unwraps through the standard cause chain so callers can detect back-end not-found
   * even when client methods wrap the original ApiError with their own message.
   */
  public static isNotFoundError(error: unknown): boolean {
    let current: Error | undefined = error instanceof Error ? error : undefined;
    while (current) {
      if (current instanceof ApiError && current.status === 404) {
        return true;
      }
      const cause = (current as { cause?: unknown }).cause;
      if (cause instanceof Error) {
        current = cause;
      } else {
        break;
      }
    }
    return false;
  }
}

/**
 * Wrap an error with a contextual prefix while preserving the original
 * error in the cause chain so type-safe unwinding works.
 */
export function wrapClientError(error: unknown, prefix: string): Error {
  const original = error instanceof Error ? error : new Error(String(error));
  const err = new Error(`${prefix}: ${original.message}`);
  // Preserve original error in cause chain for type-safe unwinding
  (err as any).cause = original;
  return err;
}
