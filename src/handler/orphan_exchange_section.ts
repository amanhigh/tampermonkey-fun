import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IExchangeRepo } from '../repo/exchange';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Orphan Exchange Audit Section
 * Displays exchange mappings without corresponding tickers in TickerRepo
 *
 * Features:
 * - Left-click: Open tvTicker in TradingView (toast if not resolvable)
 * - Right-click: Delete orphan exchange mapping from ExchangeRepo
 * - Fix All: Bulk-delete all orphan exchange mappings
 */
export class OrphanExchangeSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.ORPHAN_EXCHANGE;
  readonly title = 'Exchange';
  readonly description = 'Exchange-qualified mappings for tickers no longer present in TickerRepo';
  readonly order = 9;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Delete';

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
    this.exchangeRepo.delete(tvTicker);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    results.forEach((result) => {
      this.exchangeRepo.delete(result.target);
    });
    Notifier.success(`🗑 Removed ${results.length} orphan exchange(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()}</span>`;
    }
    return `<span class="count-badge">${this.title}: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly exchangeRepo: IExchangeRepo
  ) {
    super();
    this.plugin = plugin;
  }
}
