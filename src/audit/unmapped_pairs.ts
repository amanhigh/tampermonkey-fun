import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IPairRepo } from '../repo/pair';
import { ITickerRepo } from '../repo/ticker';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * Unmapped Pairs Audit plugin: identifies pairs without TradingView ticker mappings.
 * Checks if each pair in the pair repository has a corresponding TV ticker mapping.
 * Emits FAIL results only for pairs missing TV mappings.
 */
export class UnmappedPairsAudit extends BaseAuditPlugin {
  public readonly id = AUDIT_IDS.UNMAPPED_PAIRS;
  public readonly title = 'Unmapped Pairs';

  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs unmapped pairs audit by checking all pairs for TV ticker mapping.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for unmapped pairs
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Unmapped pairs audit does not support targeted mode');
    }

    const results: AuditResult[] = [];

    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
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
