import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ISequenceManager } from '../manager/sequence';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Orphan Sequences Audit Section
 * Displays sequence entries without corresponding tickers in TickerRepo
 *
 * Features:
 * - Left-click: Open tvTicker in TradingView (toast if not resolvable)
 * - Right-click: Delete orphan sequence entry from SequenceRepo
 * - Fix All: Bulk-delete all orphan sequence entries
 */
export class OrphanSequencesSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.ORPHAN_SEQUENCES;
  readonly title = 'Sequences';
  readonly description = 'Sequence entries (MWD/YR) for tickers no longer present in TickerRepo';
  readonly order = 7;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Delete';

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
    if (ticker) {
      this.sequenceManager.deleteSequence(ticker);
    }
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    results.forEach((result) => {
      if (result.target) {
        this.sequenceManager.deleteSequence(result.target);
      }
    });
    Notifier.success(`🗑 Removed ${results.length} orphan sequence(s)`);
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
    private readonly sequenceManager: ISequenceManager
  ) {
    super();
    this.plugin = plugin;
  }
}
