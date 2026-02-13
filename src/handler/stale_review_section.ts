import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit Section (FR-016)
 * Displays tickers not opened within the configured review window
 *
 * Features:
 * - Left-click: Open ticker in TradingView for immediate review
 * - Right-click: Stop tracking the ticker with full cascade cleanup (with confirmation)
 * - Fix All: Bulk-stop tracking for every stale ticker
 */
export class StaleReviewSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  readonly title = 'Stale Review';
  readonly description = 'Tickers not opened within the review window (default 90 days) — candidates for pruning';
  readonly order = 11;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Stop';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    this.tickerHandler.openTicker(result.target);
  };

  readonly onRightClick = (result: AuditResult): boolean => {
    const daysSinceOpen = result.data?.daysSinceOpen as number | undefined;
    const label = daysSinceOpen !== undefined && daysSinceOpen >= 0 ? `${daysSinceOpen} days stale` : 'never opened';

    if (!confirm(`Stop tracking ${result.target}? (${label})`)) {
      return false;
    }

    this.pairHandler.stopTrackingByTvTicker(result.target);
    return true;
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    if (!confirm(`Stop tracking ${results.length} stale ticker(s)?`)) {
      return;
    }

    results.forEach((result) => {
      this.pairHandler.stopTrackingByTvTicker(result.target);
    });
    Notifier.success(`⏹ Stopped tracking ${results.length} stale ticker(s)`);
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
    private readonly pairHandler: IPairHandler
  ) {
    super();
    this.plugin = plugin;
  }
}
