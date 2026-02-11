import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IFlagRepo } from '../repo/flag';
import { ITickerRepo } from '../repo/ticker';
import { ISymbolManager } from './symbol';
import { Constants } from '../models/constant';

/**
 * Orphan Flags Audit plugin: identifies flag entries without corresponding tickers.
 * Collects all unique tickers across flag categories and cross-checks against
 * TickerRepo (tvTicker keys). Formula tickers (containing '/', '*') are excluded
 * as synthetic expressions. Emits FAIL results only for orphan flag entries.
 */
export class OrphanFlagsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ORPHAN_FLAGS;
  public readonly title = 'Flags';

  constructor(
    private readonly flagRepo: IFlagRepo,
    private readonly tickerRepo: ITickerRepo,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
  }

  /**
   * Runs orphan flags audit by checking all flag tickers against ticker and pair repos.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for orphan flags
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Orphan flags audit does not support targeted mode');
    }

    const results: AuditResult[] = [];
    const categoryLists = this.flagRepo.getFlagCategoryLists();

    categoryLists.getLists().forEach((tickers, categoryIndex) => {
      tickers.forEach((ticker) => {
        // Skip formula/composite tickers (containing '/', '*', etc.)
        if (this.symbolManager.isComposite(ticker)) {
          return;
        }

        if (!this.tickerRepo.has(ticker)) {
          results.push({
            pluginId: this.id,
            code: 'ORPHAN_FLAG',
            target: ticker,
            message: `${ticker}: Flag in category ${categoryIndex} but ticker not in TickerRepo`,
            severity: 'LOW',
            status: 'FAIL',
            data: {
              ticker,
              categoryIndex,
            },
          });
        }
      });
    });

    return Promise.resolve(results);
  }
}
