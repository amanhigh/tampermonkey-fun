import { AuditResult } from '../models/audit';
import { AuditFinding } from '../models/audit_catalogue';
import { IAuditClient } from '../client/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit plugin (FR-004 / FR-016): detects tickers not opened within the
 * backend-configured review window so operators can prune or re-validate neglected
 * instruments.
 *
 * Backend adapter: delegates stale-review analysis to the Kohan backend stale-review
 * audit plugin. Computes `daysSinceOpen` client-side from the backend's `last_opened_at`
 * RFC3339 timestamp for display in the section handler.
 *
 * ## Batch-only
 * The backend stale-review audit is batch-only (audits all tracked tickers).
 * Targeted runs via `targets` parameter throw an error.
 */
export class StaleReviewPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  public readonly title = 'Stale Review';

  constructor(
    private readonly auditClient: IAuditClient,
    private readonly limit: number = 10
  ) {
    super();
  }

  /**
   * Runs stale review audit via backend. Audits entire ticker universe — targets not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for stale tickers
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets && targets.length > 0) {
      throw new Error(
        `${this.title} audit does not support targeted runs — it audits all tracked tickers on the backend.`
      );
    }

    const execution = await this.auditClient.executeAudit(this.id, 0, this.limit);
    return execution.findings.map((f) => this.toAuditResult(f));
  }

  /**
   * Maps a backend AuditFinding into a frontend AuditResult.
   * Computes `daysSinceOpen` (number) from the backend's `last_opened_at` RFC3339 string.
   */
  private toAuditResult(finding: AuditFinding): AuditResult {
    const data: Record<string, unknown> = {};

    // Preserve all backend data fields
    if (finding.data) {
      for (const [key, value] of Object.entries(finding.data)) {
        data[key] = value;
      }
    }

    // Derive daysSinceOpen from last_opened_at for section handler display
    const lastOpenedAt = finding.data?.last_opened_at;
    if (lastOpenedAt) {
      const parsed = new Date(lastOpenedAt).getTime();
      if (!isNaN(parsed)) {
        data.daysSinceOpen = Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000));
      }
    }

    return {
      pluginId: this.id,
      code: finding.code,
      target: finding.target,
      message: `${finding.target}: not recently opened`,
      severity: finding.severity as AuditResult['severity'],
      status: 'FAIL',
      data,
    };
  }
}
