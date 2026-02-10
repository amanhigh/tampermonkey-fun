import { ISmartPrompt } from '../util/smart';
import { IPairHandler } from './pair';
import { ITickerManager } from '../manager/ticker';

export interface IPanelHandler {
  showPanel(): Promise<void>;
}

enum PanelAction {
  STOP_TRACKING = 'Stop Tracking',
}

export class PanelHandler implements IPanelHandler {
  constructor(
    private readonly smartPrompt: ISmartPrompt,
    private readonly pairHandler: IPairHandler,
    private readonly tickerManager: ITickerManager
  ) {}

  public async showPanel(): Promise<void> {
    const actions = Object.values(PanelAction);
    const selected = await this.smartPrompt.showModal(actions);
    if (selected && selected !== 'Cancel') {
      this.handlePanelAction(selected as PanelAction);
    }
  }

  private handlePanelAction(action: PanelAction): void {
    let searchTicker = '';
    try {
      searchTicker = this.tickerManager.getInvestingTicker();
    } catch (error) {
      searchTicker = this.tickerManager.getTicker();
      console.warn('Using TV Ticker Instead', error);
    }

    switch (action) {
      case PanelAction.STOP_TRACKING:
        // BUG: Clarify it is investing ticker or tv ticker
        this.pairHandler.stopTrackingByInvestingTicker(searchTicker);
        break;
    }
  }
}
