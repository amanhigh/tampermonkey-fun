import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { ISequenceRepo } from '../repo/sequence';
import { ITickerRepo } from '../repo/ticker';
import { ISymbolManager } from './symbol';
import { Constants } from '../models/constant';

/**
 * Orphan Sequences Audit plugin: identifies sequence entries without corresponding tickers.
 * Checks if each key in SequenceRepo exists in TickerRepo (tvTicker keys).
 * Emits FAIL results only for orphan sequence entries.
 */
export class OrphanSequencesPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ORPHAN_SEQUENCES;
  public readonly title = 'Sequences';

  constructor(
    private readonly sequenceRepo: ISequenceRepo,
    private readonly tickerRepo: ITickerRepo,
    private readonly symbolManager: ISymbolManager
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

    this.sequenceRepo.getAllKeys().forEach((tvTicker: string) => {
      if (this.symbolManager.isComposite(tvTicker)) {
        return;
      }
      if (!this.tickerRepo.has(tvTicker)) {
        const sequence = this.sequenceRepo.get(tvTicker);
        results.push({
          pluginId: this.id,
          code: 'ORPHAN_SEQUENCE',
          target: tvTicker,
          message: `${tvTicker}: Sequence (${sequence}) exists but ticker not in TickerRepo`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            tvTicker,
            sequence,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
