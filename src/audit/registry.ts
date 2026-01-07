import { IAudit } from '../models/audit';
import type { AuditId } from '../models/audit_ids';

export class AuditRegistry {
  private readonly plugins: Map<AuditId, IAudit> = new Map();

  register(plugin: IAudit): void {
    // Validate plugin before registration
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
   * Gets an audit plugin by id, throwing an error if not found
   * Plugins are registered at initialization and must always be available
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

  list(): IAudit[] {
    return Array.from(this.plugins.values());
  }
}

// Re-export for convenience
export { AUDIT_IDS, type AuditId } from '../models/audit_ids';
