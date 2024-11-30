import { IAlertManager } from '../manager/alert';
import { ITradingViewManager } from '../manager/tv';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';

/**
 * Interface for alert handling operations
 */
export interface IAlertHandler {
  /**
   * Creates alerts from textbox values
   */
  createAlertsFromTextBox(): Promise<void>;

  /**
   * Creates alert at cursor price position
   */
  createAlertAtCursor(): Promise<void>;

  /**
   * Creates alert 20% above current price
   */
  createHighAlert(): Promise<void>;

  /**
   * Deletes alerts near cursor price
   */
  deleteAlertAtCursor(): Promise<void>;
}

/**
 * Handles alert operations and user interactions
 */
export class AlertHandler implements IAlertHandler {
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly tradingViewManager: ITradingViewManager
  ) {}

  /**
   * Creates alerts from textbox values
   */
  public async createAlertsFromTextBox(): Promise<void> {
    const command = $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val();
    if (!command) {
      return;
    }

    const prices = String(command).trim().split(' ');
    for (const p of prices) {
      try {
        await this.alertManager.createAlertForCurrentTicker(parseFloat(p));
        // TODO: Alert Coloring based on Above or Below
        Notifier.success(`Alert created at ${p}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Notifier.error(message);
      }
    }

    setTimeout(() => {
      $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val('');
    }, 5000);
  }

  /**
   * Creates alert at cursor price position
   */
  public async createAlertAtCursor(): Promise<void> {
    try {
      const price = await this.tradingViewManager.getCursorPrice();
      await this.alertManager.createAlertForCurrentTicker(price);
      Notifier.success(`Alert created at cursor price: ${price}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /**
   * Creates alert 20% above current price
   */
  public async createHighAlert(): Promise<void> {
    const currentPrice = this.tradingViewManager.getLastTradedPrice();
    if (currentPrice === null) {
      Notifier.error('Could not get current price');
      return;
    }

    const targetPrice = (currentPrice * 1.2).toFixed(2);
    try {
      await this.alertManager.createAlertForCurrentTicker(parseFloat(targetPrice));
      Notifier.success(`High alert created at ${targetPrice}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /**
   * Deletes alerts near cursor price
   */
  public async deleteAlertAtCursor(): Promise<void> {
    try {
      const price = await this.tradingViewManager.getCursorPrice();
      await this.alertManager.deleteAlertsByPrice(price);
      Notifier.success(`Alerts deleted around price: ${price}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }
}
