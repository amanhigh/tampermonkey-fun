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
  displayAlerts(alerts: Alert[] | null): void;
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
  public displayAlerts(alerts: Alert[] | null): void {
    const $container = $(`#${Constants.UI.IDS.AREAS.ALERTS}`);
    $container.empty();

    if (alerts === null) {
      this.showNoPairState($container);
      return;
    }

    if (!alerts || alerts.length === 0) {
      this.showEmptyState($container);
      return;
    }

    alerts.forEach((alert) => {
      const $button = this.createAlertButton(alert);
      $button.appendTo($container);
      this.attachDeleteHandler($button, alert);
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
    return this.uiUtil.buildButton('', displayText);
  }

  /**
   * Attaches delete handler to the alert button
   * @private
   * @param $button Button element
   * @param alert Alert associated with the button
   */
  private attachDeleteHandler($button: JQuery, alert: Alert): void {
    $button.on('click', () => {
      if (alert.id === '') {
        Notifier.warn('Pending alerts cannot be deleted');
        return;
      }
      this.alertManager
        .deleteAlert(alert)
        .then(() => {
          Notifier.success(`Alert deleted: ${alert.price}`);
          $button.remove();
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
    const color = alert.id === '' ? 'orange' : alert.price < ltp ? 'seagreen' : 'orangered';

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

  /**
   * Shows no pair info state in container
   * @private
   * @param $container Container element
   */
  private showNoPairState($container: JQuery): void {
    this.uiUtil.buildLabel('NO PAIR', 'orange').appendTo($container);
  }
}
