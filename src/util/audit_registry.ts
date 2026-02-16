import { IAuditSection } from '../handler/audit_section';

/**
 * Registry for managing audit sections
 * Provides centralized registration and lookup for all audit section implementations
 *
 * Features:
 * - Register sections with unique IDs
 * - Look up sections by ID (with optional/nullable variants)
 * - Retrieve all registered sections in registration order
 * - Order validation: no duplicate order numbers allowed (throws error)
 *
 * Pattern:
 * - Factory creates sections and registers them on initialization
 * - AuditHandler retrieves sections from registry at runtime
 * - Supports late registration for dynamic audit sections
 *
 * @example
 * ```typescript
 * const registry = new AuditSectionRegistry();
 * registry.registerSection(alertsSection);
 * const section = registry.mustGetSection('alerts');
 * ```
 */
export class AuditSectionRegistry {
  private readonly sections = new Map<string, IAuditSection>();
  private readonly orders = new Set<number>();

  /**
   * Register an audit section
   * @param section - The section to register
   * @throws Error if section ID already exists or order number is duplicate
   */
  registerSection(section: IAuditSection): void {
    if (this.sections.has(section.id)) {
      throw new Error(`Audit section '${section.id}' is already registered`);
    }

    // Check for duplicate order numbers (FR-9.11)
    if (this.orders.has(section.order)) {
      const conflict = Array.from(this.sections.values()).find((s) => s.order === section.order);
      throw new Error(
        `Duplicate audit section order ${section.order}: '${section.id}' conflicts with '${conflict?.id}'. Each section must have a unique order number.`
      );
    }

    this.orders.add(section.order);
    this.sections.set(section.id, section);
  }

  /**
   * Get a section by ID (nullable)
   * @param id - Section identifier
   * @returns The section or undefined if not found
   */
  getSection(id: string): IAuditSection | undefined {
    return this.sections.get(id);
  }

  /**
   * Get a section by ID (throws if not found)
   * @param id - Section identifier
   * @returns The section
   * @throws Error if section not found
   */
  mustGetSection(id: string): IAuditSection {
    const section = this.sections.get(id);
    if (!section) {
      throw new Error(`Audit section '${id}' not found in registry`);
    }
    return section;
  }

  /**
   * List all registered sections
   * @returns Array of all sections in registration order
   */
  listSections(): IAuditSection[] {
    return Array.from(this.sections.values());
  }

  /**
   * List all registered sections sorted by order number
   * @returns Array of all sections sorted by order (ascending)
   */
  listSectionsOrdered(): IAuditSection[] {
    return Array.from(this.sections.values()).sort((a, b) => a.order - b.order);
  }
}

// Re-export type for convenience
export type { AuditId } from '../models/constant';
