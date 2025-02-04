import { ISmartPrompt } from '../util/smart';
import { IPairHandler } from './pair';
import { ITickerManager } from '../manager/ticker';

export interface IPanelHandler {
  showPanel(): Promise<void>;
}

enum PanelAction {
  MAP_TICKER = 'Map Investing Ticker',
  DELETE_PAIR = 'Delete Pair Info',
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
      case PanelAction.MAP_TICKER:
        await this.pairHandler.mapInvestingTicker(searchTicker);
        break;
      case PanelAction.DELETE_PAIR:
        this.pairHandler.deletePairInfo(searchTicker);
        break;
    }
  }
}
