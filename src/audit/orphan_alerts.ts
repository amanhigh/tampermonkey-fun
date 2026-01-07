import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IAlertRepo } from '../repo/alert';
import { IPairRepo } from '../repo/pair';

/**
 * Orphan Alerts Audit plugin: identifies alerts without corresponding pairs.
 * Checks if each alert's pairId has a corresponding pair in the pair repository.
 * Emits FAIL results only for alerts with no matching pair.
 */
export class OrphanAlertsAudit extends BaseAuditPlugin {
  public readonly id = 'orphan-alerts';
  public readonly title = 'Orphan Alerts';

  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly pairRepo: IPairRepo
  ) {
    super();
  }

  /**
   * Runs orphan alerts audit by checking each alert for a corresponding pair.
   * Supports both batch mode (all alerts) and targeted mode (specific pairIds).
   * @param targets Optional array of specific pairIds to audit; if empty/undefined, audits all alerts
   * @returns Promise resolving to array of audit results for orphan alerts
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    // Determine which alerts to audit
    const alertsToAudit = targets && targets.length > 0 ? targets : this.alertRepo.getAllKeys();

    // Build set of valid pairIds
    const validPairIds = new Set<string>();
    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pairInfo = this.pairRepo.get(investingTicker);
      if (pairInfo) {
        validPairIds.add(pairInfo.pairId);
      }
    });

    const results: AuditResult[] = [];

    // Check each alert for a matching pair
    alertsToAudit.forEach((pairId: string) => {
      const alerts = this.alertRepo.get(pairId);

      // If this pairId doesn't exist in pairs
      if (!validPairIds.has(pairId) && alerts && alerts.length > 0) {
        // Report each alert with this orphan pairId
        alerts.forEach(() => {
          results.push({
            pluginId: this.id,
            code: 'NO_PAIR_MAPPING',
            target: pairId,
            message: `${pairId}: Alert exists but has no corresponding pair`,
            severity: 'HIGH',
            status: 'FAIL',
          });
        });
      }
    });

    return Promise.resolve(results);
  }
}
