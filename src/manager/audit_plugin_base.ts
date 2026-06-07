import { IAudit } from '../models/audit';

/**
 * Base class for audit plugins.
 *
 * ## Plugin Contract
 *
 * ### Return Behavior
 * - Plugins return **FAIL results only** (status: 'FAIL')
 * - PASS results are **implicit** (not returned)
 * - Empty array means all targets passed audit
 *
 * ### State Consistency
 * - All plugins are async for consistency (even if sync internally)
 * - Use `Promise.resolve(results)` for synchronous plugins
 *
 * ### Side Effects
 * - Plugins should be **pure** - no notifications, no persistence
 * - Manager/Handler layers handle persistence and UI
 *
 * ### Targets Support
 * - Some plugins support `targets?: string[]` for targeted audits
 * - Some plugins throw error if targets provided (batch-only)
 * - Check plugin documentation for support
 *
 * ### Backend Adapter Pattern
 * Backend-adapter plugins should extend `BackendAuditPlugin` (in `backend_audit_base.ts`)
 * instead of this base class directly. Non-backend plugins (local-computation)
 * should extend this base class and implement `run()` themselves.
 *
 * @example
 * ```typescript
 * // Backend-adapter plugin
 * class MyBackendAudit extends BackendAuditPlugin { ... }
 *
 * // Local-computation plugin
 * class MyLocalAudit extends BaseAuditPlugin {
 *   async run(targets?: string[]): Promise<AuditResult[]> { ... }
 * }
 * ```
 */
// FIXME: Consolidate into BackendAuditPlugin once all plugins migrate to backend adapter pattern
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
  // Most plugins operate in batch mode (audit all items) and throw if targets are provided
  abstract run(targets?: string[]): ReturnType<IAudit['run']>;
}
