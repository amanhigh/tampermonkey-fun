import { AuditId, Constants } from '../models/constant';
import { AuditSectionRegistry } from '../util/audit_registry';
import { IUIUtil } from '../util/ui';
import { AuditRenderer } from '../util/audit_renderer';
import { AuditResult } from '../models/audit';
import { IPairHandler } from './pair';
import { ITickerManager } from '../manager/ticker';

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
    private readonly uiUtil: IUIUtil,
    private readonly pairHandler: IPairHandler,
    private readonly tickerManager: ITickerManager
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

    // First run: render toolbar buttons (only once)
    if (!this.auditHasRun) {
      this.renderToolbarButtons();
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
    // FIXME: Lets Ensure we run all audits in the same order as they are registered or have a way to configure it.
    await this.auditOrphanAlerts();
    await this.auditGolden();
    await this.auditReverseGolden();
    await this.auditDuplicatePairIds();
    await this.auditTickerCollision();
    await this.auditOrphanSequences();
    await this.auditOrphanFlags();
    await this.auditOrphanExchange();
    await this.auditTradeRisk();
    await this.auditStaleReview();
  }

  /**
   * Renders toolbar buttons at the top of audit area:
   * Refresh All, Stop Tracking, and Map Alert
   */
  private renderToolbarButtons(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const refreshId = Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH;
    const stopTrackId = Constants.UI.IDS.BUTTONS.AUDIT_STOP_TRACKING;
    const mapAlertId = Constants.UI.IDS.BUTTONS.AUDIT_MAP_ALERT;

    // Remove old buttons if exist (in case of re-render)
    $(`#${refreshId}`).remove();
    $(`#${stopTrackId}`).remove();
    $(`#${mapAlertId}`).remove();

    // Map Alert button (FR-9.9)
    // FIXME: Make all Names small with emoji fit in single line for 3 buttons.
    const $mapAlert = this.uiUtil.buildButton(mapAlertId, '🔗 Map Alert', () => {
      const ticker = this.tickerManager.getTicker();
      void this.pairHandler.mapInvestingTicker(ticker);
    });
    $mapAlert.prependTo($auditArea);

    // Stop Tracking button (FR-9.8)
    const $stopTrack = this.uiUtil.buildButton(stopTrackId, '⏹ Stop Tracking', () => {
      try {
        const investingTicker = this.tickerManager.getInvestingTicker();
        if (confirm(`Stop tracking ${investingTicker}?`)) {
          this.pairHandler.stopTrackingByInvestingTicker(investingTicker);
        }
      } catch {
        const tvTicker = this.tickerManager.getTicker();
        if (confirm(`Stop tracking ${tvTicker}?`)) {
          this.pairHandler.stopTrackingByTvTicker(tvTicker);
        }
      }
    });
    $stopTrack.prependTo($auditArea);

    // Refresh All button
    const $refresh = this.uiUtil.buildButton(refreshId, '🔄 Refresh All Audits', () => {
      void this.auditAll();
    });
    $refresh.prependTo($auditArea);
  }

  /**
   * Gets or creates a renderer for a section, preserving collapse state across runs
   * On first call: creates renderer and appends to DOM
   * On subsequent calls: returns existing renderer (collapse state preserved)
   */
  private getOrCreateRenderer(sectionId: AuditId): AuditRenderer {
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
   * Run Golden Integrity audit and render section
   */
  private async auditGolden(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.GOLDEN);
    await renderer.refresh();
  }

  /**
   * Run Trade Risk audit and render section
   */
  private async auditTradeRisk(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.TRADE_RISK);
    await renderer.refresh();
  }

  /**
   * Run Stale Review audit and render section
   */
  private async auditStaleReview(): Promise<void> {
    const renderer = this.getOrCreateRenderer(Constants.AUDIT.PLUGINS.STALE_REVIEW);
    await renderer.refresh();
  }
}
