import { AuditId, Constants } from '../models/constant';
import { AuditSectionRegistry } from '../util/audit_registry';
import { IUIUtil } from '../util/ui';
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

  // Preserve renderer instances across auditAll() calls to retain collapse state
  private readonly renderers: Map<string, AuditRenderer> = new Map();

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

    // First run: render global refresh button (only once)
    if (!this.auditHasRun) {
      this.renderGlobalRefreshButton();
    }

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
   * Gets or creates a renderer for a section, preserving collapse state across runs
   * On first call: creates renderer and appends to DOM
   * On subsequent calls: returns existing renderer (collapse state preserved)
   */
  private getOrCreateRenderer(sectionId: AuditId): AuditRenderer {
    // HACK: Should Renderers be created in Factory?
    const existing = this.renderers.get(sectionId);
    if (existing) {
      return existing;
    }

    const section = this.auditRegistry.mustGetSection(sectionId);
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);
    renderer.render();
    this.renderers.set(sectionId, renderer);
    return renderer;
  }

  /**
   * Renders alerts audit section using AuditRenderer
   * Plugin handles all filtering (watched tickers, etc.)
   * @param pluginResults Results from AlertsAudit plugin
   */
  private auditAlerts(pluginResults: AuditResult[]): void {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.ALERTS);
    renderer.setResults(pluginResults);
  }

  /**
   * Run GTT unwatched audit and render section
   */
  private async auditGttOrders(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.GTT_UNWATCHED);
    await renderer.refresh();
  }

  /**
   * Run Orphan Alerts audit and render section
   */
  private async auditOrphanAlerts(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.ORPHAN_ALERTS);
    await renderer.refresh();
  }

  /**
   * Run ReverseGolden audit and render section
   */
  private async auditReverseGolden(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.REVERSE_GOLDEN);
    await renderer.refresh();
  }

  /**
   * Run Orphan Sequences audit and render section
   */
  private async auditOrphanSequences(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.ORPHAN_SEQUENCES);
    await renderer.refresh();
  }

  /**
   * Run Orphan Flags audit and render section
   */
  private async auditOrphanFlags(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.ORPHAN_FLAGS);
    await renderer.refresh();
  }

  /**
   * Run Orphan Exchange audit and render section
   */
  private async auditOrphanExchange(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.ORPHAN_EXCHANGE);
    await renderer.refresh();
  }

  /**
   * Run Duplicate PairIds audit and render section
   */
  private async auditDuplicatePairIds(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.DUPLICATE_PAIR_IDS);
    await renderer.refresh();
  }

  /**
   * Run Ticker Collision audit and render section
   */
  private async auditTickerCollision(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.TICKER_COLLISION);
    await renderer.refresh();
  }

  /**
   * Run Trade Risk audit and render section
   */
  private async auditTradeRisk(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.TRADE_RISK);
    await renderer.refresh();
  }
}
