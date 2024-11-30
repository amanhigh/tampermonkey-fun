import { Constants } from '../models/constant';
import { Alert } from '../models/alert';
import { IAlertManager } from '../manager/alert';
import { ITradingViewManager } from '../manager/tv';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';

/**
 * Interface for alert summary display operations
 */
export interface IAlertSummaryHandler {
  /**
   * Display alerts in summary area
   * @param alerts Array of alerts to display
   */
  displayAlerts(alerts: Alert[]): void;
}

/**
 * Handles alert summary display and interactions
 */
export class AlertSummaryHandler implements IAlertSummaryHandler {
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly tvManager: ITradingViewManager,
    private readonly uiUtil: IUIUtil
  ) {}

  /**
   * Display alerts in summary area
   * @param alerts Array of alerts to display
   */
  public displayAlerts(alerts: Alert[]): void {
    const $container = $(`#${Constants.UI.IDS.AREAS.ALERTS}`);
    $container.empty();

    if (!alerts || alerts.length === 0) {
      this.showEmptyState($container);
      return;
    }

    alerts.forEach((alert) => {
      this.createAlertButton(alert).appendTo($container);
    });
  }

  /**
   * Creates delete button for alert
   * @private
   * @param alert Alert to create button for
   * @returns Button element
   */
  private createAlertButton(alert: Alert): JQuery {
    const displayText = this.formatAlertDisplay(alert);
    return this.uiUtil.buildButton('', displayText, () => {
      this.alertManager
        .deleteAlert(alert)
        .then(() => {
          Notifier.success(`Alert deleted: ${alert.price}`);
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Unknown error';
          Notifier.error(message);
        });
    });
  }

  /**
   * Formats alert display text with color based on price comparison
   * @private
   * @param alert Alert to format
   * @returns Formatted HTML string
   */
  private formatAlertDisplay(alert: Alert): string {
    const ltp = this.tvManager.getLastTradedPrice();
    const priceString = alert.price.toString();

    // Pending alerts are orange, others colored based on price comparison
    const color = alert.id === undefined ? 'orange' : alert.price < ltp ? 'seagreen' : 'orangered';

    return this.uiUtil.colorText(priceString, color);
  }

  /**
   * Shows empty state message in container
   * @private
   * @param $container Container element
   */
  private showEmptyState($container: JQuery): void {
    this.uiUtil.buildLabel('No Alerts', 'red').appendTo($container);
  }
}
