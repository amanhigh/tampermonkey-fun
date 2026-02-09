import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IFlagManager } from '../manager/flag';
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
  readonly title = 'Orphan Flags';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const ticker = result.target;
    if (ticker) {
      this.tickerHandler.openTicker(ticker);
    } else {
      Notifier.warn(`No tvTicker found for ${result.target}`);
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const ticker = result.target;
    this.flagManager.evictTicker(ticker);
    Notifier.success(`✓ Removed orphan flag: ${ticker}`);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    results.forEach((result) => {
      this.flagManager.evictTicker(result.target);
    });
    Notifier.success(`✓ Removed ${results.length} orphan flag(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No orphan flags</span>`;
    }
    return `<span class="count-badge">Orphans: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly flagManager: IFlagManager
  ) {
    super();
    this.plugin = plugin;
  }
}
