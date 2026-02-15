import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IPairRepo } from '../repo/pair';
import { Constants } from '../models/constant';

/**
 * Duplicate PairIds Audit plugin: identifies multiple investingTicker keys
 * mapping to the same Investing.com pairId in PairRepo.
 * Emits FAIL results only for pairIds that have more than one investingTicker.
 */
export class DuplicatePairIdsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.DUPLICATE_PAIR_IDS;
  public readonly title = 'Duplicate PairIds';

  constructor(private readonly pairRepo: IPairRepo) {
    super();
  }

  /**
   * Runs duplicate pairId audit by grouping all PairRepo entries by pairId.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for duplicate pairIds
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Duplicate pairIds audit does not support targeted mode');
    }

    // Group investingTickers by pairId
    const pairIdToInvestingTickers = new Map<string, string[]>();

    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pair = this.pairRepo.get(investingTicker);
      if (!pair) {
        return;
      }

      const pairId = pair.pairId;
      if (!pairIdToInvestingTickers.has(pairId)) {
        pairIdToInvestingTickers.set(pairId, []);
      }
      pairIdToInvestingTickers.get(pairId)!.push(investingTicker);
    });

    // Emit findings for pairIds with multiple tickers
    const results: AuditResult[] = [];

    pairIdToInvestingTickers.forEach((investingTickers, pairId) => {
      if (investingTickers.length > 1) {
        // HACK: Avoid Plugins Using Repo go via Managers.        
        const pairName = this.pairRepo.get(investingTickers[0])?.name ?? pairId;
        results.push({
          pluginId: this.id,
          code: 'DUPLICATE_PAIR_ID',
          target: pairName,
          message: `${pairName} (${pairId}): shared by ${investingTickers.join(', ')}`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            pairId,
            investingTickers,
            pairName,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
