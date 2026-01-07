import { IAudit } from '../models/audit';

export class AuditRegistry {
  private readonly plugins: Map<string, IAudit> = new Map();

  register(plugin: IAudit): void {
    // Validate plugin before registration
    try {
      plugin.validate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid audit plugin '${(plugin as IAudit)?.id ?? 'unknown'}': ${msg}`);
    }

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Duplicate audit id: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Gets an audit plugin by id, throwing an error if not found
   * Plugins are registered at initialization and must always be available
   * @param id Plugin id
   * @returns The audit plugin
   * @throws Error if plugin not found
   */
  mustGet(id: string): IAudit {
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
