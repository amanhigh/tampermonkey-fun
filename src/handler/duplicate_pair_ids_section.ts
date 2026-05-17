import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ISymbolManager } from '../manager/symbol';
import { IPairManager } from '../manager/pair';
import { ICanonicalRanker } from '../manager/canonical_ranker';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Duplicate PairIds Audit Section
 * Displays pairIds shared by multiple investingTicker keys
 *
 * Features:
 * - Left-click: Open Investing ticker's TradingView chart (toast if no mapping)
 * - Right-click: Rank tickers by live signals, confirm canonical, remove lower-ranked aliases
 * - Fix All: Apply canonical-selection per pairId with summary before bulk cleanup
 */
export class DuplicatePairIdsSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.DUPLICATE_PAIR_IDS;
  readonly title = 'Duplicate PairIds';
  readonly description =
    'Multiple investing tickers sharing the same pairId (e.g., TFCI / Tata Elxsi both using 18421)';
  readonly order = 4;

  // Action labels
  readonly leftActionLabel = 'View';
  readonly rightActionLabel = 'Merge';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = async (result: AuditResult): Promise<void> => {
    const investingTickers = result.data?.investingTickers as string[] | undefined;
    const pairId = result.data?.pairId as string | undefined;
    if (!investingTickers || investingTickers.length < 2 || !pairId) {
      return;
    }

    const ranked = await this.canonicalRanker.rankInvestingTickers(investingTickers, pairId);
    const canonical = ranked[0];
    const tvTicker = this.symbolManager.investingToTv(canonical.ticker);
    if (tvTicker) {
      await this.tickerHandler.openTicker(tvTicker);
    } else {
      Notifier.warn(`No tvTicker found for ${canonical.ticker}`);
    }
  };

  readonly onRightClick = async (result: AuditResult): Promise<boolean> => {
    const investingTickers = result.data?.investingTickers as string[] | undefined;
    const pairId = result.data?.pairId as string | undefined;
    if (!investingTickers || investingTickers.length < 2 || !pairId) {
      return false;
    }

    const ranked = await this.canonicalRanker.rankInvestingTickers(investingTickers, pairId);
    const canonical = ranked[0];
    const removals = ranked.slice(1);

    const preview = `Keep: ${canonical.ticker} (score:${canonical.score}) | Remove: ${removals.map((r) => r.ticker).join(', ')}`;
    if (!confirm(preview)) {
      return false;
    }

    removals.forEach((r) => this.pairManager.removePairByInvestingTicker(r.ticker));
    Notifier.success(`🔗 Kept ${canonical.ticker}, removed ${removals.length} duplicate(s) for pairId ${pairId}`);
    return true;
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    const summaryLines: string[] = [];
    let totalRemoved = 0;

    const plans = await Promise.all(
      results.map(async (result) => {
        const investingTickers = result.data?.investingTickers as string[] | undefined;
        const pairId = result.data?.pairId as string | undefined;
        if (!investingTickers || investingTickers.length < 2 || !pairId) {
          return null;
        }
        const ranked = await this.canonicalRanker.rankInvestingTickers(investingTickers, pairId);
        const canonical = ranked[0];
        const removals = ranked.slice(1);
        summaryLines.push(`${pairId}: keep ${canonical.ticker}, remove ${removals.map((r) => r.ticker).join(', ')}`);
        return { canonical, removals };
      })
    );

    if (!confirm(`Fix All Duplicates:\n${summaryLines.join('\n')}`)) {
      return;
    }

    plans.forEach((plan) => {
      if (!plan) {
        return;
      }
      for (let i = 1; i < plan.removals.length + 1; i++) {
        this.pairManager.removePairByInvestingTicker(plan.removals[i - 1].ticker);
      }
      totalRemoved += plan.removals.length;
    });
    Notifier.success(`⏹ Stopped tracking ${totalRemoved} duplicate pair(s)`);
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
    private readonly symbolManager: ISymbolManager,
    private readonly canonicalRanker: ICanonicalRanker,
    private readonly pairManager: IPairManager
  ) {
    super();
    this.plugin = plugin;
  }
}
