import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IPairRepo } from '../repo/pair';
import { ITickerRepo } from '../repo/ticker';
import { Constants } from '../models/constant';

/**
 * Integrity Audit plugin (FR-007): ensures every investingTicker in PairRepo
 * has a corresponding tvTicker in TickerRepo.
 * Surfaces unmapped pairs that block alert creation and chart navigation.
 * Emits FAIL results only (no PASS records).
 *
 * Replaces the former GoldenPlugin and ReverseGoldenPlugin which detected
 * the same failures independently.
 */
export class IntegrityPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.INTEGRITY;
  public readonly title = 'Integrity';

  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs integrity audit by checking all pairs for TV ticker mapping.
   * Audits entire repository — targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for unmapped pairs
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Integrity audit does not support targeted mode');
    }

    const results: AuditResult[] = [];
    const seenPairIds = new Set<string>();

    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pairInfo = this.pairRepo.getPairInfo(investingTicker);
      if (!pairInfo) {
        return;
      }

      // Skip if we've already processed this pairId (deduplicate aliases)
      if (seenPairIds.has(pairInfo.pairId)) {
        return;
      }
      seenPairIds.add(pairInfo.pairId);

      const tvTicker = this.tickerRepo.getTvTicker(investingTicker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: investingTicker,
          message: `${investingTicker}: Pair exists but has no TradingView mapping`,
          severity: 'HIGH',
          status: 'FAIL',
          data: {
            investingTicker,
            pairId: pairInfo.pairId,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
