import { Constants } from '../models/constant';
import { AlertState } from '../models/alert';
import { Color } from '../models/color';
import { AuditRegistry } from '../audit/registry';
import { AUDIT_IDS } from '../models/audit_ids';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { AuditRenderer } from '../audit/renderer';
import { AuditResult } from '../models/audit';

/**
 * Interface for managing audit UI operations
 *
 * Clean architecture: ONLY handles audit sections (multi-ticker view)
 * No single-ticker button management - keep separation of concerns
 */
export interface IAuditHandler {
  /**
   * Renders all audit sections showing tickers that need attention
   * Multi-ticker view: AlertsSection, GttSection, OrphanAlertsSection
   */
  auditAll(): Promise<void>;

  /**
   * Runs audits once on first toggle (lazy-loading)
   * Subsequent calls do nothing (audit area already populated)
   */
  auditAllOnFirstRun(): Promise<void>;
}

/**
 * Handles audit section UI operations
 *
 * Architecture:
 * - Gets sections from registry (sections contain plugins)
 * - Runs plugins via section.plugin.run()
 * - Renders sections via AuditRenderer
 * - NO button management (only audit sections)
 */
export class AuditHandler implements IAuditHandler {
  // Track whether audits have ever been run (used for initial vs subsequent toggles)
  private auditHasRun: boolean = false;

  constructor(
    private readonly auditRegistry: AuditRegistry,
    private readonly uiUtil: IUIUtil
  ) {}

  /**
   * Runs all audits on first toggle, only on initial invocation
   * Subsequent calls do nothing (audit area already populated)
   * Intended for lazy-loading audits when user first opens the audit area
   */
  public async auditAllOnFirstRun(): Promise<void> {
    // Only run if audits haven't been run before
    if (this.auditHasRun) {
      return; // Already run, do nothing
    }

    // Run all audits
    await this.auditAll();
  }

  /**
   * Updates the audit summary in the UI based on current results
   */
  public async auditAll(): Promise<void> {
    // Get Alerts section from registry (section contains plugin)
    const alertsSection = this.auditRegistry.mustGetSection(AUDIT_IDS.ALERTS);

    // Run section's plugin to get audit results
    //TODO: Remove Plugin Injection and use Section directly
    const results = await alertsSection.plugin.run();

    // Calculate counts from results for notification
    const noAlertsCount = results.filter((r) => r.code === AlertState.NO_ALERTS).length;
    const singleAlertCount = results.filter((r) => r.code === AlertState.SINGLE_ALERT).length;
    const noPairCount = results.filter((r) => r.code === AlertState.NO_PAIR).length;

    // Format and show notification (handler controls UI)
    const summary =
      `Audit Results: ` +
      `${singleAlertCount} SINGLE_ALERT, ` +
      `${noAlertsCount} NO_ALERTS, ` +
      `${noPairCount} NO_PAIR`;
    Notifier.message(summary, Color.PURPLE, 10000);

    // Render global refresh button at top of audit area
    this.renderGlobalRefreshButton();

    // Clear old sections before re-rendering (prevents duplicates on refresh)
    this.clearAuditSections();

    // Render alerts UI (header + buttons) before GTT audit
    this.auditAlerts(results);

    // Run GTT audit and render new UI
    await this.auditGttOrders();

    // Run Orphan Alerts audit and render section
    await this.auditOrphanAlerts();

    // Run Unmapped Pairs audit and render section
    await this.auditUnmappedPairs();

    // Mark audits as run
    this.auditHasRun = true;
  }

  /**
   * Renders global refresh button at the top of audit area
   * Allows user to re-run all audits
   * Styling is defined in src/style/_audit_section.less
   */
  private renderGlobalRefreshButton(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const buttonId = Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH;

    // Remove old button if exists (in case of re-render)
    $(`#${buttonId}`).remove();

    // Create refresh button (styling defined in _audit_section.less)
    const $button = this.uiUtil.buildButton(buttonId, '🔄 Refresh All Audits', () => {
      void this.auditAll(); // Re-run all audits
    });

    // Add at top of audit area
    $button.prependTo($auditArea);
  }

  /**
   * Clears all audit sections from the UI
   * Preserves the global refresh button at the top
   * Called before re-rendering sections to prevent duplicates
   * @private
   */
  private clearAuditSections(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);

    // Remove all audit sections (identified by class)
    // This does NOT remove the global refresh button
    $auditArea.find(`.${Constants.AUDIT.CLASSES.SECTION}`).remove();
  }

  /**
   * Renders alerts audit section using AuditRenderer
   * Plugin handles all filtering (watched tickers, etc.)
   * @param pluginResults Results from AlertsAudit plugin
   */
  private auditAlerts(pluginResults: AuditResult[]): void {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(AUDIT_IDS.ALERTS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Set initial plugin results (plugin already handles filtering and sorting)
    renderer.setResults(pluginResults);
  }

  /**
   * Run GTT unwatched audit and render section
   */
  private async auditGttOrders(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(AUDIT_IDS.GTT_UNWATCHED);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Orphan Alerts audit and render section
   */
  private async auditOrphanAlerts(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(AUDIT_IDS.ORPHAN_ALERTS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Unmapped Pairs audit and render section
   */
  private async auditUnmappedPairs(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(AUDIT_IDS.UNMAPPED_PAIRS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }
}
