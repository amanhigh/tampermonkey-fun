import { Constants } from '../models/constant';
import { AlertState } from '../models/alert';
import { IAuditManager } from '../manager/audit';
import { IPairManager } from '../manager/pair';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { ITickerHandler } from './ticker';
import { IWatchManager } from '../manager/watch';
import { ISymbolManager } from '../manager/symbol';

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
  auditCurrent(): void;
}

/**
 * Handles all UI operations related to audit display and interactions
 */
export class AuditHandler implements IAuditHandler {
  constructor(
    private readonly auditManager: IAuditManager,
    private readonly pairManager: IPairManager,
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager
  ) {}

  /**
   * Updates the audit summary in the UI based on current results
   */
  public async auditAll(): Promise<void> {
    await this.auditManager.auditAlerts();
    const singleAlerts = this.auditManager.filterAuditResults(AlertState.SINGLE_ALERT);
    const noAlerts = this.auditManager.filterAuditResults(AlertState.NO_ALERTS);

    // Clear existing audit area
    $(`#${Constants.UI.IDS.AREAS.AUDIT}`).empty();

    // Combine and limit to 10 buttons total
    const nonWatchedAudits = [...singleAlerts, ...noAlerts].filter((audit) => {
      const tvAuditTicker = this.tryMapTvTicker(audit.investingTicker);
      return !this.watchManager.isWatched(tvAuditTicker);
    });

    // Audit Label
    this.uiUtil.buildLabel(`Audit: ${nonWatchedAudits.length} Remaining`).appendTo(`#${Constants.UI.IDS.AREAS.AUDIT}`);

    nonWatchedAudits.slice(0, 10).forEach((audit) => {
      this.createAuditButton(audit.investingTicker, audit.state).appendTo(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });
  }

  /**
   * Refreshes audit button for current ticker
   */
  public auditCurrent(): void {
    // FIXME: Perfom after Alert Creation.
    const auditResult = this.auditManager.auditCurrentTicker();

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
      this.pairManager.deletePairInfo(investingTicker);
      button.remove();
      Notifier.red(`❌ Removed mapping for ${investingTicker}`);
    });

    return button;
  }

  /**
   * Gets the background color for a button based on alert state
   * @private
   */
  private getButtonColor(investingTicker: string, state: AlertState): string {
    // Color Orange if not a Valid InvestingTicker
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    if (!tvTicker) {
      return 'darkorange';
    }

    switch (state) {
      case AlertState.SINGLE_ALERT:
        return 'darkred';
      case AlertState.NO_ALERTS:
        return 'darkgray';
      default:
        return 'black';
    }
  }

  /**
   * Generates a unique ID for an audit button based on the ticker symbol
   * @private
   */
  private getAuditButtonId(investingTicker: string): string {
    return `audit-${investingTicker}`.replace('/', '-');
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
