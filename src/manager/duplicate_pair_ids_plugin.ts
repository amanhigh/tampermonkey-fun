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
    const pairIdToTickers = new Map<string, string[]>();

    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pair = this.pairRepo.get(investingTicker);
      if (!pair) return;

      const pairId = pair.pairId;
      if (!pairIdToTickers.has(pairId)) {
        pairIdToTickers.set(pairId, []);
      }
      pairIdToTickers.get(pairId)!.push(investingTicker);
    });

    // Emit findings for pairIds with multiple tickers
    const results: AuditResult[] = [];

    pairIdToTickers.forEach((tickers, pairId) => {
      if (tickers.length > 1) {
        results.push({
          pluginId: this.id,
          code: 'DUPLICATE_PAIR_ID',
          target: pairId,
          message: `PairId ${pairId}: shared by ${tickers.join(', ')}`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            pairId,
            investingTickers: tickers,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
