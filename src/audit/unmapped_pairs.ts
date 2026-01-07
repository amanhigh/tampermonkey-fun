import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IPairRepo } from '../repo/pair';
import { ITickerRepo } from '../repo/ticker';

/**
 * Unmapped Pairs Audit plugin: identifies pairs without TradingView ticker mappings.
 * Checks if each pair in the pair repository has a corresponding TV ticker mapping.
 * Emits FAIL results only for pairs missing TV mappings.
 */
export class UnmappedPairsAudit extends BaseAuditPlugin {
  public readonly id = 'unmapped-pairs';
  public readonly title = 'Unmapped Pairs';

  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs unmapped pairs audit by checking each pair for TV ticker mapping.
   * Supports both batch mode (all pairs) and targeted mode (specific tickers).
   * @param targets Optional array of specific investing tickers to audit; if empty/undefined, audits all pairs
   * @returns Promise resolving to array of audit results for unmapped pairs
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    // Determine which pairs to audit
    const pairsToAudit = targets && targets.length > 0 ? targets : this.pairRepo.getAllKeys();

    const results: AuditResult[] = [];

    // Check each pair for TV ticker mapping
    pairsToAudit.forEach((investingTicker: string) => {
      const pairInfo = this.pairRepo.get(investingTicker);

      // Skip if pair doesn't exist (defensive)
      if (!pairInfo) {
        return;
      }

      // Check if this pair has a TV ticker mapping
      const tvTicker = this.tickerRepo.getTvTicker(investingTicker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: investingTicker,
          message: `${investingTicker}: Pair exists but has no TradingView mapping`,
          severity: 'HIGH',
          status: 'FAIL',
        });
      }
    });

    return Promise.resolve(results);
  }
}
