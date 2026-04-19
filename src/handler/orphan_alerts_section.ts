import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { IAlertManager } from '../manager/alert';
import { ITickerHandler } from './ticker';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Orphan Alerts Audit Section
 * Displays alerts that exist without corresponding pair mappings
 *
 * Features:
 * - Left-click: Open ticker in TradingView using alert name
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
  readonly description = 'Alerts whose pairId no longer exists in PairRepo — orphaned after pair removal';
  readonly order = 1;

  // Action labels
  readonly leftActionLabel = 'View';
  readonly rightActionLabel = 'Delete';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10;
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (result: AuditResult) => {
    const alertName = result.data?.alertName as string | undefined;
    if (alertName) {
      this.tickerHandler.openTicker(alertName);
    } else {
      Notifier.warn(`${result.target} — no name available, cannot navigate`, 3000);
    }
  };

  readonly onRightClick = async (result: AuditResult): Promise<boolean> => {
    return this.handleOrphanDeletion(result);
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    let totalDeleted = 0;
    for (const result of results) {
      const pairId = result.data?.pairId as string | undefined;
      if (!pairId) {
        continue;
      }

      const alerts = this.alertManager.getAlertsByPairId(pairId);
      if (!alerts || alerts.length === 0) {
        continue;
      }

      await Promise.all(alerts.map(async (alert) => this.alertManager.deleteAlert(alert)));
      this.alertManager.deleteAlertsByPairId(pairId);
      totalDeleted += alerts.length;
    }
    Notifier.success(`✓ Deleted ${totalDeleted} orphan alert(s) for ${results.length} pair(s)`);
  };

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()}</span>`;
    }
    return `<span style="color: darkred">${this.title}: ${auditResults.length}</span>`;
  };

  /**
   * Creates an Orphan Alerts audit section
   * @param plugin - IAudit plugin for orphan alerts (injected directly)
   * @param alertManager - Manager for alert operations
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly alertManager: IAlertManager,
    private readonly uiUtil: IUIUtil
  ) {
    super();
    this.plugin = plugin;
  }

  /**
   * Handle deletion of orphan alerts with confirmation
   * @param result - AuditResult with pairId and alertCount in data field
   */
  private async handleOrphanDeletion(result: AuditResult): Promise<boolean> {
    try {
      // Extract metadata from result
      const pairId = result.data?.pairId as string | undefined;
      const alertCount = result.data?.alertCount as number | undefined;

      if (!pairId) {
        Notifier.warn('Invalid orphan alert result: missing pairId');
        return false;
      }

      // Get all alerts for this pairId
      const alerts = this.alertManager.getAlertsByPairId(pairId);
      if (!alerts || alerts.length === 0) {
        Notifier.warn(`No alerts found for pairId ${pairId}`);
        return false;
      }

      const message = this.buildDeleteMessage(pairId, alertCount, alerts);

      // Show confirmation dialog
      if (!this.uiUtil.showConfirm('Delete Orphan Alerts', message)) {
        Notifier.info('Deletion cancelled');
        return false;
      }

      // Show progress notification
      Notifier.info(`Deleting ${alerts.length} alert(s)...`);

      // Delete each alert from Investing.com via AlertManager
      await Promise.all(alerts.map(async (alert) => this.alertManager.deleteAlert(alert)));

      // Remove from local store via manager
      this.alertManager.deleteAlertsByPairId(pairId);

      // Success notification
      Notifier.success(`✓ Deleted ${alerts.length} orphan alert(s) for ${pairId}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Notifier.error(`Failed to delete alerts: ${errorMessage}`);
      console.error('Orphan alert deletion failed:', error);
      return false;
    }
  }

  private buildDeleteMessage(pairId: string, alertCount: number | undefined, alerts: { price: number }[]): string {
    const prices = alerts.map((a) => a.price).join(', ');
    return (
      `Delete ${alertCount || alerts.length} orphan alert(s)?\n\n` +
      `PairId: ${pairId}\n` +
      `Prices: ${prices}\n\n` +
      `This will permanently delete these alerts from Investing.com.`
    );
  }
}
