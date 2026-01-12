import { IAudit } from '../models/audit';
import { IAuditSection } from './section';
import type { AuditId } from '../models/audit_ids';

/**
 * Unified registry for audit components
 * Stores sections (which contain their plugins)
 * Also temporarily stores plugins for backwards compatibility
 */
export class AuditRegistry {
  private readonly plugins: Map<AuditId, IAudit> = new Map();
  private readonly sections: Map<AuditId, IAuditSection> = new Map();

  /**
   * Registers a plugin
   * @param plugin The audit plugin to register
   * @throws Error if plugin is invalid or duplicate id
   */
  registerPlugin(plugin: IAudit): void {
    try {
      plugin.validate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid audit plugin '${(plugin as IAudit)?.id ?? 'unknown'}': ${msg}`);
    }

    if (this.plugins.has(plugin.id as AuditId)) {
      throw new Error(`Duplicate audit id: ${plugin.id}`);
    }
    this.plugins.set(plugin.id as AuditId, plugin);
  }

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
   * Gets an audit plugin by id (for backwards compatibility)
   * @param id Plugin id (use AUDIT_IDS constants)
   * @returns The audit plugin
   * @throws Error if plugin not found
   */
  mustGet(id: AuditId): IAudit {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Audit plugin '${id}' not found in registry`);
    }
    return plugin;
  }

  /**
   * Lists all registered plugins
   */
  list(): IAudit[] {
    return Array.from(this.plugins.values());
  }
}

// Re-export for convenience
export { AUDIT_IDS, type AuditId } from '../models/audit_ids';
