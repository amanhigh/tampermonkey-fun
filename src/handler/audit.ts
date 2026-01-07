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
import { IKiteHandler } from './kite';

/**
 * Interface for managing audit UI operations
 */
export interface IAuditHandler {
  /**
   * Updates the audit summary in the UI based on current results
   */
  auditAll(): Promise<void>;

  /**
   * Refreshes audit button for current ticker
   */
  auditCurrent(): Promise<void>;
}

/**
 * Handles all UI operations related to audit display and interactions
 */
export class AuditHandler implements IAuditHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly auditManager: IAuditManager,
    private readonly auditRegistry: AuditRegistry,
    private readonly tickerManager: ITickerManager,
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager,
    private readonly pairHandler: IPairHandler,
    private readonly kiteHandler: IKiteHandler
  ) {}

  /**
   * Updates the audit summary in the UI based on current results
   */
  public async auditAll(): Promise<void> {
    // Get AlertsAudit plugin from registry
    const alertsPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ALERTS);

    // Run plugin to get audit results
    const results = await alertsPlugin.run();

    // Reset audit data and save new batch results
    this.auditManager.resetAuditResults(results);

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

    // Render alerts UI (header + buttons) before GTT audit
    this.auditAlerts();

    // Run GTT audit after rendering
    await this.kiteHandler.performGttAudit();
  }

  // Renders audit header and buttons based on current repository state
  private auditAlerts(): void {
    const singles = this.getSortedAudits(AlertState.SINGLE_ALERT);
    const none = this.getSortedAudits(AlertState.NO_ALERTS);

    // Decide visible items (prioritize SINGLE_ALERT up to 10, then fill with NO_ALERTS)
    const maxItems = 10;
    const singlesToShow = singles.slice(0, Math.min(maxItems, singles.length));
    const remainingSlots = Math.max(0, maxItems - singlesToShow.length);
    const noneToShow = none.slice(0, remainingSlots);
    const displayItems = [...singlesToShow, ...noneToShow];

    // Totals (across all filtered items, not just visible)
    const totalAll = singles.length + none.length;
    const invalidAll = [...singles, ...none].filter((a) => !this.symbolManager.investingToTv(a.investingTicker)).length;

    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    $auditArea.empty();

    // Header with colored counts in priority: Single (orange), None (gray), Invalid (red)
    this.renderHeaderColors($auditArea, totalAll, singles.length, none.length, invalidAll);

    // Render buttons inline (no partitions), rely on button colors to communicate state
    this.renderButtons($auditArea, displayItems);
  }

  // Build header: exact summary + colored count labels matching button colors
  private renderHeaderColors(
    $root: JQuery,
    totalCount: number,
    singleCount: number,
    noneCount: number,
    invalidCount: number
  ): void {
    // Short header: One, None, Inv, Tot (no 'Audit: ...')
    this.uiUtil.buildLabel(`One: ${singleCount}`, 'darkorange').appendTo($root);
    this.uiUtil.buildLabel(`None: ${noneCount}`, 'darkgray').css({ marginLeft: '6px' }).appendTo($root);
    this.uiUtil.buildLabel(`Inv: ${invalidCount}`, 'darkred').css({ marginLeft: '6px' }).appendTo($root);
    this.uiUtil.buildLabel(`Tot: ${totalCount}`, 'lightgray').css({ marginLeft: '6px' }).appendTo($root);
    $('<div>').css({ height: '6px' }).appendTo($root);
  }

  // Return filtered (hide watched) and alphabetically sorted audits for a state
  private getSortedAudits(state: AlertState) {
    return this.auditManager
      .filterAuditResults(state)
      .filter((a) => !this.watchManager.isWatched(this.tryMapTvTicker(a.investingTicker)))
      .sort((a, b) => a.investingTicker.localeCompare(b.investingTicker));
  }

  // Render list of buttons (no group separators)
  private renderButtons($root: JQuery, items: { investingTicker: string; state: AlertState }[]): void {
    items.forEach((audit) => {
      this.createAuditButton(audit.investingTicker, audit.state).appendTo($root);
    });
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
