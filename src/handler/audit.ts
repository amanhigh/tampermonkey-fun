import { Constants } from '../models/constant';
import { AlertState } from '../models/alert';
import { IAuditManager } from '../manager/audit';
import { IPairManager } from '../manager/pair';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';
import { ITickerHandler } from './ticker';

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
    private readonly tickerHandler: ITickerHandler
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

    // Add single alert buttons
    singleAlerts.forEach((audit) => {
      this.createAuditButton(audit.investingTicker, audit.state).appendTo(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });

    // Add no-alert buttons
    noAlerts.forEach((audit) => {
      this.createAuditButton(audit.investingTicker, audit.state).appendTo(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });
  }

  /**
   * Refreshes audit button for current ticker
   */
  public auditCurrent(): void {
    const auditResult = this.auditManager.auditCurrentTicker();

    // Find existing button for this ticker
    const $button = $(`#${this.getAuditButtonId(auditResult.investingTicker)}`);

    // If ticker has valid alerts, remove the button if it exists
    if (auditResult.state === AlertState.VALID) {
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
    const backgroundColor = this.getButtonColor(state);

    const button = this.uiUtil
      .buildButton(buttonId, investingTicker, () => this.tickerHandler.openTicker(investingTicker))
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
  private getButtonColor(state: AlertState): string {
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
}
