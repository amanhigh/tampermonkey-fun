import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { ISequenceRepo } from '../repo/sequence';
import { ITickerRepo } from '../repo/ticker';
import { IPairRepo } from '../repo/pair';
import { Constants } from '../models/constant';

/**
 * Orphan Sequences Audit plugin: identifies sequence entries without corresponding tickers.
 * Checks if each key in SequenceRepo exists in TickerRepo (tvTicker) or PairRepo (investingTicker).
 * Emits FAIL results only for orphan sequence entries.
 */
export class OrphanSequencesPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ORPHAN_SEQUENCES;
  public readonly title = 'Orphan Sequences';

  constructor(
    private readonly sequenceRepo: ISequenceRepo,
    private readonly tickerRepo: ITickerRepo,
    private readonly pairRepo: IPairRepo
  ) {
    super();
  }

  /**
   * Runs orphan sequences audit by checking all sequence keys against ticker and pair repos.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for orphan sequences
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Orphan sequences audit does not support targeted mode');
    }

    const results: AuditResult[] = [];

    this.sequenceRepo.getAllKeys().forEach((ticker: string) => {
      const inTickerRepo = this.tickerRepo.has(ticker);
      const inPairRepo = this.pairRepo.has(ticker);

      if (!inTickerRepo && !inPairRepo) {
        const sequence = this.sequenceRepo.get(ticker);
        results.push({
          pluginId: this.id,
          code: 'ORPHAN_SEQUENCE',
          target: ticker,
          message: `${ticker}: Sequence (${sequence}) exists but ticker not in TickerRepo or PairRepo`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            ticker,
            sequence,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
