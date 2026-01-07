import { ISmartPrompt } from '../util/smart';
import { IPairHandler } from './pair';
import { ITickerManager } from '../manager/ticker';
import { IValidationManager } from '../manager/validation';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';

export interface IPanelHandler {
  showPanel(): Promise<void>;
}

enum PanelAction {
  DELETE_PAIR = 'Delete Pair Info',
  VALIDATE_DATA = 'Validate Data Integrity',
}

export class PanelHandler implements IPanelHandler {
  constructor(
    private readonly smartPrompt: ISmartPrompt,
    private readonly pairHandler: IPairHandler,
    private readonly tickerManager: ITickerManager,
    private readonly validationManager: IValidationManager
  ) {}

  public async showPanel(): Promise<void> {
    const actions = Object.values(PanelAction);
    const selected = await this.smartPrompt.showModal(actions);
    if (selected && selected !== 'Cancel') {
      await this.handlePanelAction(selected as PanelAction);
    }
  }

  private async handlePanelAction(action: PanelAction): Promise<void> {
    let searchTicker = '';
    try {
      searchTicker = this.tickerManager.getInvestingTicker();
    } catch (error) {
      searchTicker = this.tickerManager.getTicker();
      console.warn('Using TV Ticker Instead', error);
    }

    switch (action) {
      case PanelAction.DELETE_PAIR:
        await this.pairHandler.deletePairInfo(searchTicker);
        break;
      case PanelAction.VALIDATE_DATA:
        await this.handleValidation();
        break;
    }
  }

  private async handleValidation(): Promise<void> {
    try {
      const results = await this.validationManager.validate();

      // Show formatted summary in notification
      Notifier.message(results.getFormattedSummary(), Color.ROYAL_BLUE, 10000);

      // Log details to console
      results.logDetailedResults();
    } catch (error) {
      console.error('Validation failed:', error);
      Notifier.message('Data validation failed. Check console for details.', Color.ROYAL_BLUE, 5000);
    }
  }
}
