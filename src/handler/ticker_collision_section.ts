import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ITickerRepo } from '../repo/ticker';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Ticker Collision Audit Section
 * Displays reverse map collisions where multiple tvTickers map to the same investingTicker
 *
 * Features:
 * - Left-click: Open the first tvTicker alias in TradingView
 * - Right-click: Delete the stale tvTicker alias from TickerRepo
 * - Fix All: Bulk-clean alias collisions
 */
export class TickerCollisionSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.TICKER_COLLISION;
  readonly title = 'Ticker Collisions';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const tvTickers = result.data?.tvTickers as string[] | undefined;
    if (tvTickers && tvTickers.length > 0) {
      this.tickerHandler.openTicker(tvTickers[0]);
    } else {
      Notifier.warn(`No tvTicker found for ${result.target}`);
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const tvTickers = result.data?.tvTickers as string[] | undefined;
    if (!tvTickers || tvTickers.length < 2) return;

    // Delete all but the first (canonical) tvTicker alias
    const staleAliases = tvTickers.slice(1);
    staleAliases.forEach((tvTicker) => {
      this.tickerRepo.delete(tvTicker);
    });
    Notifier.success(`✓ Removed ${staleAliases.length} stale alias(es) for ${result.target}`);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    let totalRemoved = 0;
    results.forEach((result) => {
      const tvTickers = result.data?.tvTickers as string[] | undefined;
      if (!tvTickers || tvTickers.length < 2) return;
      const staleAliases = tvTickers.slice(1);
      staleAliases.forEach((tvTicker) => {
        this.tickerRepo.delete(tvTicker);
      });
      totalRemoved += staleAliases.length;
    });
    Notifier.success(`✓ Removed ${totalRemoved} stale ticker alias(es)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ticker collisions</span>`;
    }
    return `<span class="count-badge">Collisions: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
    this.plugin = plugin;
  }
}
