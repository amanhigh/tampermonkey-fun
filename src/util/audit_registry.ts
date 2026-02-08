import { IAuditSection } from '../handler/audit_section';
import type { AuditId } from '../models/audit_ids';

/**
 * Registry for audit sections only
 * Sections contain their own plugins (private access)
 */
export class AuditSectionRegistry {
  private readonly sections: Map<AuditId, IAuditSection> = new Map();

  /**
   * Registers a section
   * @param section The audit section to register
   * @throws Error if duplicate id
   */
  registerSection(section: IAuditSection): void {
    if (this.sections.has(section.id as AuditId)) {
      throw new Error(`Duplicate section id: ${section.id}`);
    }
    this.sections.set(section.id as AuditId, section);
  }

  /**
   * Gets an audit section by id
   * @param id Section id (use AUDIT_IDS constants)
   * @returns The audit section
   * @throws Error if section not found
   */
  mustGetSection(id: AuditId): IAuditSection {
    const section = this.sections.get(id);
    if (!section) {
      throw new Error(`Section '${id}' not found in registry`);
    }
    return section;
  }

  /**
   * Lists all registered sections
   */
  listSections(): IAuditSection[] {
    return Array.from(this.sections.values());
  }
}

// Re-export for convenience
export { AUDIT_IDS, type AuditId } from '../models/audit_ids';
