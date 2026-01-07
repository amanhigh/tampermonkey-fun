import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IAlertRepo } from '../repo/alert';
import { IPairRepo } from '../repo/pair';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * Orphan Alerts Audit plugin: identifies alerts without corresponding pairs.
 * Checks if each alert's pairId has a corresponding pair in the pair repository.
 * Emits FAIL results only for alerts with no matching pair.
 */
export class OrphanAlertsAudit extends BaseAuditPlugin {
  public readonly id = AUDIT_IDS.ORPHAN_ALERTS;
  public readonly title = 'Orphan Alerts';

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
      validPairIds.add(this.pairRepo.get(investingTicker)!.pairId);
    });

    const results: AuditResult[] = [];

    // Report alerts for pairIds not in validPairIds
    this.alertRepo.getAllKeys().forEach((pairId: string) => {
      if (!validPairIds.has(pairId)) {
        const alerts = this.alertRepo.get(pairId)!;
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
