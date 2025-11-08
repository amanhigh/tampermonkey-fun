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

  get(id: string): IAudit | undefined {
    return this.plugins.get(id);
  }

  list(): IAudit[] {
    return Array.from(this.plugins.values());
  }
}
