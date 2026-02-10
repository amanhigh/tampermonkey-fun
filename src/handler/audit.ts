import { Constants } from '../models/constant';
import { AlertState } from '../models/alert';
import { Color } from '../models/color';
import { AuditSectionRegistry } from '../util/audit_registry';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { AuditRenderer } from '../util/audit_renderer';
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
    private readonly auditRegistry: AuditSectionRegistry,
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
    const alertsSection = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ALERTS);

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

    // Run all remaining audits
    await this.runRemainingAudits();

    // Mark audits as run
    this.auditHasRun = true;
  }

  /**
   * Runs all remaining audits in sequence after GTT and Alerts
   */
  private async runRemainingAudits(): Promise<void> {
    await this.auditOrphanAlerts();
    await this.auditReverseGolden();
    await this.auditOrphanSequences();
    await this.auditOrphanFlags();
    await this.auditOrphanExchange();
    await this.auditDuplicatePairIds();
    await this.auditTickerCollision();
    await this.auditTradeRisk();
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
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ALERTS);

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
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.GTT_UNWATCHED);

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
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ORPHAN_ALERTS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run ReverseGolden audit and render section
   */
  private async auditReverseGolden(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.REVERSE_GOLDEN);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Orphan Sequences audit and render section
   */
  private async auditOrphanSequences(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ORPHAN_SEQUENCES);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Orphan Flags audit and render section
   */
  private async auditOrphanFlags(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ORPHAN_FLAGS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Orphan Exchange audit and render section
   */
  private async auditOrphanExchange(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.ORPHAN_EXCHANGE);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Duplicate PairIds audit and render section
   */
  private async auditDuplicatePairIds(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.DUPLICATE_PAIR_IDS);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Ticker Collision audit and render section
   */
  private async auditTickerCollision(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.TICKER_COLLISION);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }

  /**
   * Run Trade Risk audit and render section
   */
  private async auditTradeRisk(): Promise<void> {
    // Get section from registry (section contains plugin)
    const section = this.auditRegistry.mustGetSection(Constants.AUDIT.PLUGINS.TRADE_RISK);

    // Create renderer with section and render
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);

    // Render initial (empty) section first
    renderer.render();

    // Now run audit via renderer (this records timestamp and updates display)
    await renderer.refresh();
  }
}
