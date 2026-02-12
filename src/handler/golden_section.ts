import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ISymbolManager } from '../manager/symbol';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Golden Integrity Audit Section (FR-008)
 * Displays investing tickers that lack a TradingView mapping
 *
 * Features:
 * - Left-click: Open investing ticker in TradingView (toast if no mapping)
 * - Right-click: Delete stale tickerRepo entry
 * - Fix All: Bulk-delete stale tickerRepo entries
 */
export class GoldenSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.GOLDEN;
  readonly title = 'Golden Integrity';
  readonly description = 'TradingView tickers in TickerRepo whose Investing counterpart is missing from PairRepo';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const investingTicker = result.target;
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    if (tvTicker) {
      this.tickerHandler.openTicker(tvTicker);
    } else {
      Notifier.warn(`No TV mapping for ${investingTicker}`);
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const investingTicker = result.target;
    // FIXME: Should this do StopTrackingByInvestingTicker?
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    if (tvTicker) {
      this.symbolManager.deleteTvTicker(tvTicker);
      Notifier.success(`✓ Removed stale tickerRepo entry for ${investingTicker}`);
    } else {
      Notifier.warn(`No TV mapping to delete for ${investingTicker}`);
    }
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    let totalRemoved = 0;
    results.forEach((result) => {
      const tvTicker = this.symbolManager.investingToTv(result.target);
      if (tvTicker) {
        this.symbolManager.deleteTvTicker(tvTicker);
        totalRemoved++;
      }
    });
    Notifier.success(`✓ Removed ${totalRemoved} stale tickerRepo entry(ies)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()} issues</span>`;
    }
    return `<span class="count-badge">${this.title}: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
    this.plugin = plugin;
  }
}
