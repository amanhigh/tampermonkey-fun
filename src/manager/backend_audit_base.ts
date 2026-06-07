import { AuditResult } from '../models/audit';
import { AuditFinding } from '../models/audit_catalogue';
import { IAuditClient } from '../client/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { Constants } from '../models/constant';

/**
 * Base class for backend-adapter audit plugins.
 *
 * Provides a ready-to-use `run()` that delegates to `auditClient.executeAudit()`
 * and maps findings via the `toAuditResult()` template method. Subclasses only
 * need to set `id` / `title` and optionally override `toAuditResult()`.
 *
 * ## Backend Adapter Pattern
 * - `run()` delegates to the Kohan backend audit plugin via `IAuditClient`.
 * - `toAuditResult()` maps a backend `AuditFinding` into a frontend `AuditResult`.
 * - Batch-only: no targeted mode — audits all tracked tickers.
 *
 * ## Usage
 * ```typescript
 * class MyBackendAudit extends BackendAuditPlugin {
 *   readonly id = 'my-audit';
 *   readonly title = 'My Audit';
 *
 *   constructor(auditClient: IAuditClient) {
 *     super(auditClient);
 *   }
 *
 *   protected toAuditResult(finding: AuditFinding): AuditResult {
 *     return { ...super.toAuditResult(finding), message: `${finding.target}: custom` };
 *   }
 * }
 * ```
 */
export abstract class BackendAuditPlugin extends BaseAuditPlugin {
  /**
   * @param auditClient Backend audit client for executing the audit check.
   * @param limit Page size for backend pagination (default: `DEFAULT_SECTION_LIMIT`).
   */
  constructor(
    protected readonly auditClient: IAuditClient,
    protected readonly limit: number = Constants.AUDIT.DEFAULT_SECTION_LIMIT
  ) {
    super();
  }

  /**
   * Delegates to the backend `auditClient.executeAudit()` and maps findings
   * via `toAuditResult()`. Batch-only — no targeted mode supported.
   */
  async run(): Promise<AuditResult[]> {
    const execution = await this.auditClient.executeAudit(this.id, 0, this.limit);
    return execution.findings.map((f) => this.toAuditResult(f));
  }

  /**
   * Maps a backend `AuditFinding` into a frontend `AuditResult`.
   *
   * Default mapping:
   * - `pluginId` → `this.id`
   * - `code` → `finding.code`
   * - `target` → `finding.target`
   * - `message` → `"${finding.target}: ${finding.code}"`
   * - `severity` → `finding.severity` (cast)
   * - `status` → `'FAIL'`
   * - `data` → `finding.data` (cast to `Record<string, unknown>`)
   *
   * Subclasses override this to customise `message` or `data`.
   */
  protected toAuditResult(finding: AuditFinding): AuditResult {
    return {
      pluginId: this.id,
      code: finding.code,
      target: finding.target,
      message: `${finding.target}: ${finding.code}`,
      severity: finding.severity as AuditResult['severity'],
      status: 'FAIL',
      data: finding.data as Record<string, unknown> | undefined,
    };
  }
}
