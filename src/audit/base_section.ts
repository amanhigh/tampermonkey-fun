/**
 * Base class for all audit section implementations
 * Provides shared functionality for section implementations
 *
 * Audit sections implement IAuditSection directly, providing
 * their own configuration (id, title, handlers, etc.)
 *
 * Sections now receive their plugins via direct injection (not via registry)
 */
export abstract class BaseAuditSection {
  // Empty base class - available for future shared methods
}
