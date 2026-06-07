import { IAuditClient } from '../client/audit';
import { BackendAuditPlugin } from './backend_audit_base';
import { Constants } from '../models/constant';

/**
 * Alerts Coverage audit plugin.
 *
 * Backend adapter: delegates alert-coverage analysis to the Kohan backend
 * alert-coverage audit plugin. Uses the default `toAuditResult()` from
 * `BackendAuditPlugin` — no override needed.
 *
 * ## Batch-only
 * The backend alert audit is batch-only — audits all tracked tickers.
 */
export class AlertsPlugin extends BackendAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ALERT_COVERAGE;
  public readonly title = 'Alert Coverage';

  constructor(auditClient: IAuditClient, limit: number = Constants.AUDIT.DEFAULT_SECTION_LIMIT) {
    super(auditClient, limit);
  }
}
