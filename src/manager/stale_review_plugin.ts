import { AuditResult } from '../models/audit';
import { AuditFinding } from '../models/audit_catalogue';
import { IAuditClient } from '../client/audit';
import { BackendAuditPlugin } from './backend_audit_base';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit plugin (FR-004 / FR-016): detects tickers not opened within the
 * backend-configured review window so operators can prune or re-validate neglected
 * instruments.
 *
 * Backend adapter: delegates stale-review analysis to the Kohan backend stale-review
 * audit plugin. Customises `toAuditResult()` to compute `daysSinceOpen` client-side
 * from the backend's `last_opened_at` RFC3339 timestamp.
 *
 * ## Batch-only
 * The backend stale-review audit is batch-only — audits all tracked tickers.
 */
export class StaleReviewPlugin extends BackendAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  public readonly title = 'Stale Review';

  constructor(auditClient: IAuditClient, limit: number = Constants.AUDIT.DEFAULT_SECTION_LIMIT) {
    super(auditClient, limit);
  }

  /**
   * Maps a backend AuditFinding into a frontend AuditResult.
   * Computes `daysSinceOpen` (number) from the backend's `last_opened_at` RFC3339 string
   * for display in the section handler.
   */
  protected toAuditResult(finding: AuditFinding): AuditResult {
    // Spread backend data fields into a mutable copy
    const data: Record<string, unknown> = { ...(finding.data || {}) };

    // Derive daysSinceOpen from last_opened_at for section handler display
    const lastOpenedAt = finding.data?.last_opened_at;
    if (lastOpenedAt) {
      const parsed = new Date(lastOpenedAt).getTime();
      if (!isNaN(parsed)) {
        data.daysSinceOpen = Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000));
      }
    }

    return {
      ...super.toAuditResult(finding),
      message: `${finding.target}: not recently opened`,
      data,
    };
  }
}
