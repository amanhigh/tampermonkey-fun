import { ISmartPrompt } from '../util/smart';
import { ITickerHandler } from './ticker';
import { IDomManager } from '../manager/dom';

export interface IPanelHandler {
  showPanel(): Promise<void>;
}

enum PanelAction {
  STOP_TRACKING = 'Stop Tracking',
}

export class PanelHandler implements IPanelHandler {
  constructor(
    private readonly smartPrompt: ISmartPrompt,
    private readonly tickerHandler: ITickerHandler,
    private readonly domManager: IDomManager
  ) {}

  public async showPanel(): Promise<void> {
    const actions = Object.values(PanelAction);
    const response = await this.smartPrompt.showModal(actions);

    // Handle cancel - user explicitly cancelled
    if (response.type === 'cancel') {
      return;
    }

    // Handle none - not applicable for panel actions, treat as cancel
    if (response.type === 'none') {
      return;
    }

    // Handle reason - should be a PanelAction
    if (response.type === 'reason') {
      const action = response.value as PanelAction;
      await this.handlePanelAction(action);
    }
  }

  private async handlePanelAction(action: PanelAction): Promise<void> {
    const tvTicker = this.domManager.getTicker();
    switch (action) {
      case PanelAction.STOP_TRACKING:
        await this.tickerHandler.stopTracking(tvTicker);
        break;
    }
  }
}
