import { AuditResult } from '../models/audit';
import { AuditFinding } from '../models/audit_catalogue';
import { IAuditClient } from '../client/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { Constants } from '../models/constant';

/**
 * Alerts Coverage audit plugin.
 *
 * Now a backend adapter: delegates alert-coverage analysis to the Kohan backend
 * alert-coverage audit plugin. Returns findings mapped into frontend AuditResult[]
 * for rendering via the existing section → renderer → handler stack.
 *
 * ## Batch-only
 * The backend alert audit is batch-only (audits all tracked tickers).
 * Targeted runs via `targets` parameter throw an error.
 */
export class AlertsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ALERT_COVERAGE;
  public readonly title = 'Alert Coverage';

  constructor(
    private readonly auditClient: IAuditClient,
    private readonly limit: number = 10
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets && targets.length > 0) {
      throw new Error(
        `${this.title} audit does not support targeted runs — it audits all tracked tickers on the backend.`
      );
    }

    const execution = await this.auditClient.executeAudit(this.id, 0, this.limit);
    return execution.findings.map((f) => this.toAuditResult(f));
  }

  private toAuditResult(finding: AuditFinding): AuditResult {
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
