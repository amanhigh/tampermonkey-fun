import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { ISymbolManager } from '../manager/symbol';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Duplicate PairIds Audit Section
 * Displays pairIds shared by multiple investingTicker keys
 *
 * Features:
 * - Left-click: Open Investing ticker's TradingView chart (toast if no mapping)
 * - Right-click: Delete the selected duplicate investingTicker entry from PairRepo
 * - Fix All: Bulk-remove every duplicate entry returned by the audit
 */
export class DuplicatePairIdsSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.DUPLICATE_PAIR_IDS;
  readonly title = 'Duplicate PairIds';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const investingTickers = result.data?.investingTickers as string[] | undefined;
    if (investingTickers && investingTickers.length > 0) {
      const tvTicker = this.symbolManager.investingToTv(investingTickers[0]);
      if (tvTicker) {
        this.tickerHandler.openTicker(tvTicker);
      } else {
        Notifier.warn(`No tvTicker found for ${investingTickers[0]}`);
      }
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const investingTickers = result.data?.investingTickers as string[] | undefined;
    if (!investingTickers || investingTickers.length < 2) {
      return;
    }

    // Delete all but the first (canonical) investingTicker
    const duplicates = investingTickers.slice(1);
    duplicates.forEach((ticker) => {
      this.pairHandler.deletePairInfo(ticker);
    });
    Notifier.success(`✓ Removed ${duplicates.length} duplicate(s) for pairId ${result.target}`);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    let totalRemoved = 0;
    results.forEach((result) => {
      const investingTickers = result.data?.investingTickers as string[] | undefined;
      if (!investingTickers || investingTickers.length < 2) {
        return;
      }
      const duplicates = investingTickers.slice(1);
      duplicates.forEach((ticker) => {
        this.pairHandler.deletePairInfo(ticker);
      });
      totalRemoved += duplicates.length;
    });
    Notifier.success(`✓ Removed ${totalRemoved} duplicate pair(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No duplicate pairIds</span>`;
    }
    return `<span class="count-badge">Duplicates: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly pairHandler: IPairHandler,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
    this.plugin = plugin;
  }
}
