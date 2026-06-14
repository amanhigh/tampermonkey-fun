import { Constants } from '../models/constant';
import { Alert } from '../models/alert';
import { IAlertManager } from '../manager/alert';
import { ITradingViewManager } from '../manager/tv';
import { IUIUtil } from '../util/ui';
import { Notifier } from '../util/notify';

// ── Alert tint CSS classes (defined in _alert_bar.less) ──

const ALERT_CLASS = {
  LOW: 'aman-alert-low',
  HIGH: 'aman-alert-high',
  PENDING: 'aman-alert-pending',
  EMPTY: 'aman-alert-empty',
  NO_PAIR: 'aman-alert-no-pair',
} as const;

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
   * Creates delete button for alert with tint class
   * @private
   * @param alert Alert to create button for
   * @returns Button element
   */
  private createAlertButton(alert: Alert): JQuery {
    const displayText = this.formatAlertDisplay(alert);
    const tintClass = this.getTintClass(alert);
    return this.uiUtil.buildButton('', displayText).addClass(tintClass);
  }

  /**
   * Determines the tint CSS class based on alert state and LTP.
   * @private
   * @param alert Alert to evaluate
   * @returns CSS class name
   */
  private getTintClass(alert: Alert): string {
    if (alert.id === '') {
      return ALERT_CLASS.PENDING;
    }
    const ltp = this.tvManager.getLastTradedPrice();
    return alert.price < ltp ? ALERT_CLASS.LOW : ALERT_CLASS.HIGH;
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
      void this.alertManager.deleteAlert(alert.id).then(() => {
        Notifier.red(`❌ Alert deleted: ${alert.price}`);
        $button.remove();
      });
    });
  }

  /**
   * Formats alert display text with emoji prefix and color based on price comparison
   * @private
   * @param alert Alert to format
   * @returns Formatted HTML string
   */
  private formatAlertDisplay(alert: Alert): string {
    const ltp = this.tvManager.getLastTradedPrice();
    const priceString = alert.price.toString();

    // Pending alerts are orange, others colored based on price comparison
    if (alert.id === '') {
      return this.uiUtil.colorText(`🟠 ${priceString}`, 'orange');
    }
    if (alert.price < ltp) {
      return this.uiUtil.colorText(`🟢 ${priceString}`, 'seagreen');
    }
    return this.uiUtil.colorText(`🔴 ${priceString}`, 'red');
  }

  /**
   * Shows empty state — one-line "No Alerts"
   * @private
   * @param $container Container element
   */
  private showEmptyState($container: JQuery): void {
    this.uiUtil.buildLabel('🔴 No Alerts', 'red').addClass(ALERT_CLASS.EMPTY).appendTo($container);
  }

  /**
   * Shows no pair info state — one-line "No Pair"
   * @private
   * @param $container Container element
   */
  private showNoPairState($container: JQuery): void {
    this.uiUtil.buildLabel('⚠️ No Pair', 'orange').addClass(ALERT_CLASS.NO_PAIR).appendTo($container);
  }
}
