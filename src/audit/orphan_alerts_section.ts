import { AuditResult } from '../models/audit';
import { IAuditSection } from './section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './base_section';
import { IAlertRepo } from '../repo/alert';
import { Notifier } from '../util/notify';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * Orphan Alerts Audit Section
 * Displays alerts that exist without corresponding pair mappings
 *
 * Features:
 * - Left-click: Show notification (cannot open without pair mapping)
 * - Right-click: Delete orphan alerts for this pairId
 * - Pagination: Navigate through large result sets
 *
 * Pattern:
 * - Receives plugin via direct injection (not via registry)
 * - Plugin contains the business logic for finding orphan alerts
 * - Section defines the UI specification and interaction handlers
 */
export class OrphanAlertsSection extends BaseAuditSection implements IAuditSection {
  // Identity - shares ID with ORPHAN_ALERTS plugin
  readonly id = AUDIT_IDS.ORPHAN_ALERTS;
  readonly title = 'Orphan Alerts';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10;
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (pairId: string) => {
    Notifier.warn(`Cannot open ${pairId} - no pair mapping exists`, 3000);
  };

  readonly onRightClick = (pairId: string) => {
    void Promise.resolve().then(() => {
      this.alertRepo.delete(pairId);
      Notifier.red(`❌ Deleted orphan alerts for ${pairId}`);
    });
  };

  /**
   * Button color mapper - all orphan alerts are high severity (darkred)
   */
  readonly buttonColorMapper = (): string => 'darkred'; // eslint-disable-line @typescript-eslint/no-unused-vars

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ No orphan alerts</span>`;
    }
    return `<span style="color: darkred">Orphans: ${auditResults.length}</span>`;
  };

  /**
   * Creates an Orphan Alerts audit section
   * @param plugin - IAudit plugin for orphan alerts (injected directly)
   * @param alertRepo - Repository for alert operations
   */
  constructor(
    plugin: IAudit,
    private readonly alertRepo: IAlertRepo
  ) {
    super();
    this.plugin = plugin;
  }
}
