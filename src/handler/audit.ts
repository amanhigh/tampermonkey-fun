import { Constants } from '../models/constant';
import { AlertState } from '../models/alert';
import { Color } from '../models/color';
import { IAuditManager } from '../manager/audit';
import { AuditRegistry } from '../audit/registry';
import { AUDIT_IDS } from '../models/audit_ids';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { ITickerHandler } from './ticker';
import { ITickerManager } from '../manager/ticker';
import { IWatchManager } from '../manager/watch';
import { ISymbolManager } from '../manager/symbol';
import { IPairHandler } from './pair';
import { AuditRenderer } from '../audit/renderer';
import { AuditResult } from '../models/audit';

/**
 * Interface for managing audit UI operations
 */
export interface IAuditHandler {
  /**
   * Updates the audit summary in the UI based on current results
   */
  auditAll(): Promise<void>;

  /**
   * Runs all audits on first toggle, only on initial invocation
   * Subsequent calls do nothing (audit area already populated)
   * Intended for lazy-loading audits when user first opens the audit area
   */
  auditAllOnFirstRun(): Promise<void>;

  /**
   * Refreshes audit button for current ticker
   */
  auditCurrent(): Promise<void>;
}

/**
 * Handles all UI operations related to audit display and interactions
 *
 * Architecture:
 * - Gets sections from registry (sections contain plugins)
 * - Runs plugins via section.plugin.run()
 * - Renders sections via AuditSection component
 */
export class AuditHandler implements IAuditHandler {
  // Track whether audits have ever been run (used for initial vs subsequent toggles)
  private auditHasRun: boolean = false;

  // eslint-disable-next-line max-params
  constructor(
    private readonly auditManager: IAuditManager,
    private readonly auditRegistry: AuditRegistry,
    private readonly tickerManager: ITickerManager,
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager,
    private readonly pairHandler: IPairHandler
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
    // Get AlertsAudit plugin from registry
    const alertsPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ALERTS);

    // Run plugin to get audit results
    const results = await alertsPlugin.run();

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

    // Render alerts UI (header + buttons) before GTT audit
    this.auditAlerts(results);

    // Run GTT audit and render new UI
    await this.auditGttOrders();

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
   * Refreshes audit button for current ticker
   */
  public async auditCurrent(): Promise<void> {
    // Get current ticker
    const investingTicker = this.tickerManager.getInvestingTicker();

    // Get AlertsAudit plugin from registry
    const alertsPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ALERTS);

    // Run plugin for current ticker
    const results = await alertsPlugin.run([investingTicker]);

    // Determine state from results
    let state: AlertState;
    if (results.length > 0) {
      // Plugin returned a FAIL result; use the code as state
      state = results[0].code as AlertState;
    } else {
      // No results means PASS/VALID state
      state = AlertState.VALID;
    }

    // Update audit result via manager
    const auditResult = this.auditManager.updateTickerAudit(investingTicker, state);

    // Find existing button for this ticker
    const $button = $(`#${this.getAuditButtonId(auditResult.investingTicker)}`);

    // If ticker has valid alerts or watched, remove the button if it exists
    const tvAuditTicker = this.tryMapTvTicker(auditResult.investingTicker);
    if (auditResult.state === AlertState.VALID || this.watchManager.isWatched(tvAuditTicker)) {
      $button.remove();
      return;
    }

    // Create new button with updated state
    const newButton = this.createAuditButton(auditResult.investingTicker, auditResult.state);

    // Replace existing button or append new one
    if ($button.length) {
      $button.replaceWith(newButton);
    } else {
      newButton.appendTo(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    }
  }

  /**
   * Creates an audit button for a given ticker
   * @private
   * @param investingTicker The ticker symbol
   * @param state Current alert state for the ticker
   * @returns The created button element
   */
  private createAuditButton(investingTicker: string, state: AlertState): JQuery {
    const buttonId = this.getAuditButtonId(investingTicker);

    // Define button style based on alert state
    const backgroundColor = this.getButtonColor(investingTicker, state);

    const button = this.uiUtil
      .buildButton(buttonId, investingTicker, () => {
        const tvTicker = this.tryMapTvTicker(investingTicker);
        this.tickerHandler.openTicker(tvTicker);
      })
      .css({
        'background-color': backgroundColor,
        margin: '2px',
      });

    button.on('contextmenu', (e: JQuery.ContextMenuEvent) => {
      e.preventDefault();
      void this.pairHandler.deletePairInfo(investingTicker).then(() => {
        button.remove();
        Notifier.red(`❌ Removed mapping for ${investingTicker}`);
      });
    });

    return button;
  }

  /**
   * Gets the background color for a button based on alert state
   * @private
   */
  private getButtonColor(investingTicker: string, state: AlertState): string {
    // Red if no valid TV mapping
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    if (!tvTicker) {
      return 'darkred';
    }

    switch (state) {
      case AlertState.SINGLE_ALERT:
        return 'darkorange';
      case AlertState.NO_ALERTS:
        return 'darkgray';
      default:
        return 'black';
    }
  }

  /**
   * Generates a unique ID for an audit button based on the ticker symbol
   * Escapes CSS selector special characters to prevent jQuery parsing errors
   * @private
   * @param investingTicker The ticker symbol that may contain special characters
   * @returns A CSS-safe ID string for use in jQuery selectors
   */
  private getAuditButtonId(investingTicker: string): string {
    // Replace all CSS selector special characters with hyphens
    // Preserves alphanumeric characters, hyphens, and underscores only
    // Handles cases like: US10YT=X → audit-US10YT-X, M&M → audit-M-M, NSE:RELIANCE → audit-NSE-RELIANCE
    return `audit-${investingTicker}`.replace(/[^a-zA-Z0-9-_]/g, '-');
  }

  /**
   * Attempts to map an investing ticker to a tv ticker
   * @private
   * @param investingTicker The ticker symbol
   * @returns The mapped tv ticker or the original ticker if no mapping exists
   */
  private tryMapTvTicker(investingTicker: string): string {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    return tvTicker || investingTicker;
  }
}
