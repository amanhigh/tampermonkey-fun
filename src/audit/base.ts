import { IAudit } from '../models/audit';

/**
 * Simple base for audit plugins providing common validations.
 */
export abstract class BaseAuditPlugin implements IAudit {
  abstract readonly id: string;
  abstract readonly title: string;

  // Default validation for id/title; subclasses can extend via super.validate()
  validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Audit id must be non-empty');
    }
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Audit title must be non-empty');
    }
  }

  // Force implementations to provide run()
  abstract run(): ReturnType<IAudit['run']>;
}
