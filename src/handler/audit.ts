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

    // Render alerts UI (header + buttons) before other audits
    // Alerts has order 0 and uses setResults (not refresh) for special handling
    this.auditAlerts(results);

    // Run all remaining audits in order (skipping alerts with order 0)
    await this.runOrderedAudits();

    // Mark audits as run
    this.auditHasRun = true;
  }

  /**
   * Runs all audits in order number sequence (FR-9.1, FR-9.10)
   * Skips alerts (order 0) as it's handled separately with setResults
   */
  private async runOrderedAudits(): Promise<void> {
    const orderedSections = this.auditRegistry.listSectionsOrdered();

    for (const section of orderedSections) {
      // Skip alerts section (order 0) - already handled separately
      if (section.order === 0) {
        continue;
      }

      const renderer = this.getOrCreateRenderer(section.id as AuditId);
      await renderer.refresh();
    }
  }

  /**
   * Renders toolbar buttons at the top of audit area:
   * Refresh All, Stop Tracking, and Map Alert in a flex row
   */
  private renderToolbarButtons(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const refreshId = Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH;
    const stopTrackId = Constants.UI.IDS.BUTTONS.AUDIT_STOP_TRACKING;
    const mapAlertId = Constants.UI.IDS.BUTTONS.AUDIT_MAP_ALERT;

    // Remove old toolbar if exists (in case of re-render)
    $auditArea.find('.audit-toolbar').remove();

    const $toolbar = $('<div>').addClass('audit-toolbar');

    // Refresh All button
    this.uiUtil
      .buildButton(refreshId, '\u{1F504} Refresh', () => {
        // BUG: Refresh button runs audits but does not update ticker text box/display header
        void this.auditAll();
      })
      .appendTo($toolbar);

    // Stop Tracking button (FR-9.8)
    this.uiUtil
      .buildButton(stopTrackId, '⏹ Stop', () => {
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
      })
      .appendTo($toolbar);

    // Map Alert button (FR-9.9)
    this.uiUtil
      .buildButton(mapAlertId, '\u{1F517} Map', () => {
        const ticker = this.tickerManager.getTicker();
        // BUG: Mapping from toolbar does not refresh ticker/alerts to show new mapping state
        void this.pairHandler.mapInvestingTicker(ticker);
      })
      .appendTo($toolbar);

    $toolbar.prependTo($auditArea);
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
}
