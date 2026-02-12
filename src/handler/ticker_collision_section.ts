import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ICanonicalRanker } from '../manager/canonical_ranker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Ticker Collision Audit Section
 * Displays reverse map collisions where multiple tvTickers map to the same investingTicker
 *
 * Features:
 * - Left-click: Open the first tvTicker alias in TradingView
 * - Right-click: Rank aliases by live signals, confirm canonical, remove lower-ranked via cascade cleanup
 * - Fix All: Bulk-clean alias collisions with ranking-based canonical selection
 */
export class TickerCollisionSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.TICKER_COLLISION;
  readonly title = 'Ticker Collisions';
  readonly description = 'Multiple TradingView tickers mapping to the same Investing ticker — ambiguous reverse lookup';

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

  readonly onRightClick = (result: AuditResult): boolean => {
    const tvTickers = result.data?.tvTickers as string[] | undefined;
    if (!tvTickers || tvTickers.length < 2) {
      return false;
    }

    const ranked = this.canonicalRanker.rankTvTickers(tvTickers);
    const canonical = ranked[0];
    const removals = ranked.slice(1);

    const preview = `Keep: ${canonical.ticker} (score:${canonical.score}) | Remove: ${removals.map((r) => r.ticker).join(', ')}`;
    if (!confirm(preview)) {
      return false;
    }

    removals.forEach((r) => this.pairHandler.stopTrackingByTvTicker(r.ticker));
    Notifier.success(`✓ Kept ${canonical.ticker}, removed ${removals.length} stale alias(es) for ${result.target}`);
    return true;
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    const summaryLines: string[] = [];
    let totalRemoved = 0;

    const plans = results.map((result) => {
      const tvTickers = result.data?.tvTickers as string[] | undefined;
      if (!tvTickers || tvTickers.length < 2) {
        return null;
      }
      const ranked = this.canonicalRanker.rankTvTickers(tvTickers);
      const canonical = ranked[0];
      const removals = ranked.slice(1);
      summaryLines.push(
        `${result.target}: keep ${canonical.ticker}, remove ${removals.map((r) => r.ticker).join(', ')}`
      );
      return { removals };
    });

    if (!confirm(`Fix All Collisions:\n${summaryLines.join('\n')}`)) {
      return;
    }

    plans.forEach((plan) => {
      if (!plan) {
        return;
      }
      plan.removals.forEach((r) => this.pairHandler.stopTrackingByTvTicker(r.ticker));
      totalRemoved += plan.removals.length;
    });
    Notifier.success(`✓ Removed ${totalRemoved} stale ticker alias(es)`);
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
    private readonly canonicalRanker: ICanonicalRanker,
    private readonly pairHandler: IPairHandler
  ) {
    super();
    this.plugin = plugin;
  }
}
