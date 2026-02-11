import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Orphan Flags Audit Section
 * Displays flag entries without corresponding tickers in TickerRepo
 *
 * Features:
 * - Left-click: Open tvTicker in TradingView (toast if not resolvable)
 * - Right-click: Remove orphan ticker from its flag category
 * - Fix All: Bulk-remove all orphan flag entries
 */
export class OrphanFlagsSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.ORPHAN_FLAGS;
  readonly title = 'Flags';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const tvTicker = result.target;
    if (tvTicker) {
      this.tickerHandler.openTicker(tvTicker);
    } else {
      Notifier.warn(`No tvTicker found for ${result.target}`);
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const tvTicker = result.target;
    this.pairHandler.stopTrackingByTvTicker(tvTicker);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    results.forEach((result) => {
      this.pairHandler.stopTrackingByTvTicker(result.target);
    });
    Notifier.success(`⏹ Stopped tracking ${results.length} orphan flag(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No orphan flags</span>`;
    }
    return `<span class="count-badge">Orphan Flags: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly pairHandler: IPairHandler
  ) {
    super();
    this.plugin = plugin;
  }
}
