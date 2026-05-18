import { ISequenceManager } from '../manager/sequence';
import { IDomManager } from '../manager/dom';
import { ISymbolManager } from '../manager/symbol';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { Constants } from '../models/constant';
import { SequenceType } from '../models/trading';

/**
 * Interface for sequence handling operations
 */
export interface ISequenceHandler {
  /**
   * Handles the sequence switch operation
   */
  handleSequenceSwitch(): Promise<void>;

  /**
   * Displays sequence information in the input
   */
  displaySequence(): Promise<void>;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   */
  toggleFreezeSequence(): Promise<void>;
}

/**
 * Handles sequence operations and display
 */
export class SequenceHandler implements ISequenceHandler {
  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly tickerManager: IDomManager,
    private readonly symbolManager: ISymbolManager,
    private readonly alertTickerManager: IAlertTickerManager
  ) {}

  /** @inheritdoc */
  async handleSequenceSwitch(): Promise<void> {
    await this.sequenceManager.flipSequence();
    // Update the sequence display
    await this.displaySequence();
  }

  /** @inheritdoc */
  async displaySequence(): Promise<void> {
    const sequence = await this.sequenceManager.getCurrentSequence();
    const tvTicker = this.tickerManager.getTicker();
    const investingTicker = this.symbolManager.tvToInvesting(tvTicker);

    // Show investingTicker when unmapped, otherwise show tvTicker
    const displayTicker = investingTicker || tvTicker;
    let message = `${displayTicker}:${sequence}`;

    // Add first alert ticker name after sequence if available
    if (tvTicker) {
      const tickers = await this.alertTickerManager.getAlertTickers(tvTicker);
      const first = tickers[0];
      if (first && first.name) {
        message += `:${first.name}`;
      }
    }

    const $displayInput = $(`#${Constants.UI.IDS.INPUTS.DISPLAY}`);
    $displayInput.val(message);

    // Background colors: maroon for unmapped, blue for YR sequence, black otherwise
    if (!investingTicker) {
      $displayInput.css('background-color', 'maroon');
    } else if (sequence === SequenceType.YR) {
      $displayInput.css('background-color', 'blue');
    } else {
      $displayInput.css('background-color', 'black');
    }
  }

  /** @inheritdoc */
  async toggleFreezeSequence(): Promise<void> {
    await this.sequenceManager.toggleFreezeSequence();
  }
}
