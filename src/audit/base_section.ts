import { AuditResult } from '../models/audit';
import { Constants } from '../models/constant';

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
  /**
   * Default button color mapper based on audit result severity
   * Can be overridden by sections that need custom color logic
   * @param result Audit result containing severity
   * @param _context Optional context data (not used in default implementation)
   * @returns Color string for the button
   */
  public buttonColorMapper(result: AuditResult, _context?: unknown): string {
    switch (result.severity) {
      case 'LOW':
        return Constants.UI.COLORS.SEVERITY.LOW;
      case 'MEDIUM':
        return Constants.UI.COLORS.SEVERITY.MEDIUM;
      case 'HIGH':
        return Constants.UI.COLORS.SEVERITY.HIGH;
      default:
        return Constants.UI.COLORS.SEVERITY.LOW;
    }
  }
}
