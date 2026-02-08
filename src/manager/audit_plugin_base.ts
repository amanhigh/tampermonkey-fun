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
 * @example
 * ```typescript
 * class MyAudit extends BaseAuditPlugin {
 *   async run(targets?: string[]): Promise<AuditResult[]> {
 *     const items = targets || this.getAllItems();
 *     const results: AuditResult[] = [];
 *
 *     items.forEach(item => {
 *       if (this.checkFailed(item)) {
 *         results.push({
 *           pluginId: this.id,
 *           code: 'FAILURE_CODE',
 *           target: item,
 *           message: `${item}: failure description`,
 *           severity: 'HIGH',
 *           status: 'FAIL',
 *         });
 *       }
 *       // No result for passed items
 *     });
 *
 *     return Promise.resolve(results);
 *   }
 * }
 * ```
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
  // Most plugins operate in batch mode (audit all items) and throw if targets are provided
  abstract run(targets?: string[]): ReturnType<IAudit['run']>;
}
