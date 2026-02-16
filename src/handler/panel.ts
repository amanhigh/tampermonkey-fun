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
    try {
      const investingTicker = this.tickerManager.getInvestingTicker();
      switch (action) {
        case PanelAction.STOP_TRACKING:
          this.pairHandler.stopTrackingByInvestingTicker(investingTicker);
          break;
      }
    } catch {
      const tvTicker = this.tickerManager.getTicker();
      switch (action) {
        case PanelAction.STOP_TRACKING:
          // TODO: Stop Tracking should involve both Investing and TV Tickers for Manual Buttons.
          this.pairHandler.stopTrackingByTvTicker(tvTicker);
          break;
      }
    }
  }
}
