import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { Alert } from '../models/alert';
import { IAlertRepo } from '../repo/alert';
import { IPairRepo } from '../repo/pair';
import { Constants } from '../models/constant';

/**
 * Orphan Alerts Audit plugin: identifies alerts without corresponding pairs.
 * Checks if each alert's pairId has a corresponding pair in the pair repository.
 * Emits FAIL results only for alerts with no matching pair.
 */
export class OrphanAlertsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ORPHAN_ALERTS;
  public readonly title = 'Alerts';

  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly pairRepo: IPairRepo
  ) {
    super();
  }

  /**
   * Runs orphan alerts audit by checking all alerts for corresponding pairs.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for orphan alerts
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Orphan alerts audit does not support targeted mode');
    }

    // Build set of valid pairIds from pairs
    const validPairIds = new Set<string>();
    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pair = this.pairRepo.get(investingTicker)!;
      validPairIds.add(pair.pairId);
    });

    const results: AuditResult[] = [];

    // Report alerts for pairIds not in validPairIds (orphan alerts without pair mappings)
    this.alertRepo.getAllKeys().forEach((pairId: string) => {
      if (!validPairIds.has(pairId)) {
        const alerts = this.alertRepo.get(pairId)!;
        const alertName = this.resolveAlertName(alerts, pairId);
        // Create single result per orphan pairId, metadata in data field
        results.push({
          pluginId: this.id,
          code: 'NO_PAIR_MAPPING',
          target: alertName,
          message: `${alertName}: ${alerts.length} alert(s) exist but have no corresponding pair`,
          severity: 'HIGH',
          status: 'FAIL',
          data: {
            pairId,
            alertName,
            alertCount: alerts.length,
          },
        });
      }
    });

    return Promise.resolve(results);
  }

  /**
   * Resolves a human-readable name for an orphan alert group.
   * Uses the first alert's data-name attribute if available, falls back to pairId.
   * @param alerts Array of alerts for this pairId
   * @param pairId The pair identifier
   * @returns Human-readable name or pairId as fallback
   */
  private resolveAlertName(alerts: Alert[], pairId: string): string {
    const name = alerts.find((a) => a.name)?.name;
    return name || pairId;
  }
}
