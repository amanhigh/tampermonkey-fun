import { ISequenceManager } from '../manager/sequence';
import { ITickerManager } from '../manager/ticker';
import { Constants } from '../models/constant';
import { SequenceType } from '../models/trading';

/**
 * Interface for sequence handling operations
 */
export interface ISequenceHandler {
  /**
   * Handles the sequence switch operation
   */
  handleSequenceSwitch(): void;

  /**
   * Displays sequence information in the input
   */
  displaySequence(): void;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   * @returns Current freeze state after toggle
   */
  toggleFreezeSequence(): void;
}

/**
 * Handles sequence operations and display
 */
export class SequenceHandler implements ISequenceHandler {
  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly tickerManager: ITickerManager
  ) {}

  /** @inheritdoc */
  handleSequenceSwitch(): void {
    this.sequenceManager.flipSequence();
    // Update the sequence display
    this.displaySequence();
  }

  /** @inheritdoc */
  displaySequence(): void {
    const sequence = this.sequenceManager.getCurrentSequence();
    const tvTicker = this.tickerManager.getTicker();

    const message = `${tvTicker}:${sequence}`;
    const $displayInput = $(`#${Constants.UI.IDS.INPUTS.DISPLAY}`);
    $displayInput.val(message);
    if (sequence === SequenceType.YR) {
      $displayInput.css('background-color', 'maroon');
    } else {
      $displayInput.css('background-color', 'black');
    }
  }

  /** @inheritdoc */
  toggleFreezeSequence(): void {
    this.sequenceManager.toggleFreezeSequence();
  }
}
