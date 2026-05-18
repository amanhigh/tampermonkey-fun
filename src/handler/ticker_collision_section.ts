import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ICanonicalRanker } from '../manager/canonical_ranker';
import { IAlertTickerManager } from '../manager/alert_ticker';
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
  readonly order = 5;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Merge';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = async (result: AuditResult): Promise<void> => {
    const tvTickers = result.data?.tvTickers as string[] | undefined;
    if (!tvTickers || tvTickers.length < 2) {
      // Fallback: try opening via investingTicker or display name
      const investingTicker = result.data?.investingTicker as string | undefined;
      if (investingTicker) {
        const alertTicker = await this.alertTickerManager.fetchAlertTicker(investingTicker);
        if (alertTicker) {
          await this.tickerHandler.openTicker(alertTicker.ticker);
          return;
        }
      }
      Notifier.warn(`No tvTicker found for ${result.target}`);
      return;
    }

    const ranked = await this.canonicalRanker.rankTvTickers(tvTickers);
    await this.tickerHandler.openTicker(ranked[0].ticker);
  };

  readonly onRightClick = async (result: AuditResult): Promise<boolean> => {
    const tvTickers = result.data?.tvTickers as string[] | undefined;
    if (!tvTickers || tvTickers.length < 2) {
      return false;
    }

    const ranked = await this.canonicalRanker.rankTvTickers(tvTickers);
    const canonical = ranked[0];
    const removals = ranked.slice(1);

    const preview = `Keep: ${canonical.ticker} (score:${canonical.score}) | Remove: ${removals.map((r) => r.ticker).join(', ')}`;
    if (!confirm(preview)) {
      return false;
    }

    // Removals now mean stopping tracking on the TickerManager
    // For each alias, stop tracking (backend cascade deletes linked alert tickers)
    for (const r of removals) {
      await this.tickerHandler.stopTracking(r.ticker);
    }
    Notifier.success(`🔗 Kept ${canonical.ticker}, removed ${removals.length} alias(es) for ${result.target}`);
    return true;
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    const summaryLines: string[] = [];
    let totalRemoved = 0;

    const plans = await Promise.all(
      results.map(async (result) => {
        const tvTickers = result.data?.tvTickers as string[] | undefined;
        if (!tvTickers || tvTickers.length < 2) {
          return null;
        }
        const ranked = await this.canonicalRanker.rankTvTickers(tvTickers);
        const canonical = ranked[0];
        const removals = ranked.slice(1);
        summaryLines.push(
          `${result.target}: keep ${canonical.ticker}, remove ${removals.map((r) => r.ticker).join(', ')}`
        );
        return { removals };
      })
    );

    if (!confirm(`Fix All Collisions:\n${summaryLines.join('\n')}`)) {
      return;
    }

    for (const plan of plans) {
      if (!plan) {
        continue;
      }
      for (const r of plan.removals) {
        await this.tickerHandler.stopTracking(r.ticker);
      }
      totalRemoved += plan.removals.length;
    }
    Notifier.success(`🔗 Removed ${totalRemoved} ticker alias(es)`);
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
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly canonicalRanker: ICanonicalRanker
  ) {
    super();
    this.plugin = plugin;
  }
}
