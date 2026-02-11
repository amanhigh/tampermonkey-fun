import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { IAlertRepo } from '../repo/alert';
import { IAlertManager } from '../manager/alert';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

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
  readonly id = Constants.AUDIT.PLUGINS.ORPHAN_ALERTS;
  readonly title = 'Alerts';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10;
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (result: AuditResult) => {
    const alertName = result.data?.alertName as string | undefined;
    const pairId = result.data?.pairId as string | undefined;
    const label = alertName || pairId || result.target;
    Notifier.warn(`${label} — no ticker mapping, cannot navigate`, 3000);
  };

  readonly onRightClick = async (result: AuditResult): Promise<void> => {
    await this.handleOrphanDeletion(result);
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    let totalDeleted = 0;
    for (const result of results) {
      const pairId = result.data?.pairId as string | undefined;
      if (!pairId) {
        continue;
      }

      const alerts = this.alertRepo.get(pairId);
      if (!alerts || alerts.length === 0) {
        continue;
      }

      await Promise.all(alerts.map(async (alert) => this.alertManager.deleteAlert(alert)));
      this.alertRepo.delete(pairId);
      totalDeleted += alerts.length;
    }
    Notifier.success(`✓ Deleted ${totalDeleted} orphan alert(s) for ${results.length} pair(s)`);
  };

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ No orphan alerts</span>`;
    }
    return `<span style="color: darkred">Orphan Alerts: ${auditResults.length}</span>`;
  };

  /**
   * Creates an Orphan Alerts audit section
   * @param plugin - IAudit plugin for orphan alerts (injected directly)
   * @param alertRepo - Repository for alert operations
   * @param alertManager - Manager for alert deletion operations
   */
  constructor(
    plugin: IAudit,
    private readonly alertRepo: IAlertRepo,
    private readonly alertManager: IAlertManager
  ) {
    super();
    this.plugin = plugin;
  }

  /**
   * Handle deletion of orphan alerts with confirmation
   * @param result - AuditResult with pairId and alertCount in data field
   */
  private async handleOrphanDeletion(result: AuditResult): Promise<void> {
    try {
      // Extract metadata from result
      const pairId = result.data?.pairId as string | undefined;
      const alertCount = result.data?.alertCount as number | undefined;

      if (!pairId) {
        Notifier.warn('Invalid orphan alert result: missing pairId');
        return;
      }

      // Get all alerts for this pairId
      const alerts = this.alertRepo.get(pairId);
      if (!alerts || alerts.length === 0) {
        Notifier.warn(`No alerts found for pairId ${pairId}`);
        return;
      }

      // Build confirmation message
      const prices = alerts.map((a) => a.price).join(', ');
      const message =
        `Delete ${alertCount || alerts.length} orphan alert(s)?\n\n` +
        `PairId: ${pairId}\n` +
        `Prices: ${prices}\n\n` +
        `This will permanently delete these alerts from Investing.com.`;

      // Show confirmation dialog
      if (!confirm(message)) {
        Notifier.info('Deletion cancelled');
        return;
      }

      // Show progress notification
      Notifier.info(`Deleting ${alerts.length} alert(s)...`);

      // Delete each alert from Investing.com via AlertManager
      await Promise.all(alerts.map(async (alert) => this.alertManager.deleteAlert(alert)));

      // Remove from local repo
      this.alertRepo.delete(pairId);

      // Success notification
      Notifier.success(`✓ Deleted ${alerts.length} orphan alert(s) for ${pairId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Notifier.error(`Failed to delete alerts: ${errorMessage}`);
      console.error('Orphan alert deletion failed:', error);
    }
  }
}
