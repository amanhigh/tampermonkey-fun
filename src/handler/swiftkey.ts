import { ITradingViewManager } from '../manager/tv';

export interface ISwiftKeyHandler {
  /**
   * Synchronizes document title with current SwiftKey state
   * Uses TradingViewManager for state detection and title operations
   */
  syncTitle(): void;
}

export class SwiftKeyHandler implements ISwiftKeyHandler {
  constructor(private readonly tvManager: ITradingViewManager) {}

  public syncTitle(): void {
    const enabled = this.tvManager.isSwiftKeysEnabled();
    if (enabled) {
      // HACK: Multiple Calls on Ticker Switch Improve further
      this.tvManager.setSwiftKeysState(enabled);
    }
  }
}
