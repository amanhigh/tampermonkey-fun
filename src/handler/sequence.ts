import { ISequenceManager } from '../manager/sequence';
import { IDomManager } from '../manager/dom';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { ITickerManager } from '../manager/ticker';
import { Constants } from '../models/constant';
import { SequenceType } from '../models/trading';
import { Notifier } from '../util/notify';

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

  /**
   * Starts tracking the current ticker by creating a backend record
   * using the current sequence's timeframes and DOM context.
   */
  startTracking(): Promise<void>;
}

/**
 * Handles sequence operations and display
 */
export class SequenceHandler implements ISequenceHandler {
  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly tickerManager: ITickerManager
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
    const tvTicker = this.domManager.getTicker();
    const alertTicker = await this.alertTickerManager.getAlertTicker(tvTicker);
    const investingTicker = alertTicker?.symbol ?? null;

    // Show investingTicker when unmapped, otherwise show tvTicker
    const displayTicker = investingTicker || tvTicker;
    let message = `${displayTicker}:${sequence}`;

    // Add first alert ticker name after sequence if available
    if (alertTicker && alertTicker.name) {
      message += `:${alertTicker.name}`;
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

  /** @inheritdoc */
  async startTracking(): Promise<void> {
    const ticker = this.domManager.getTicker();
    const exchange = this.domManager.getCurrentExchange();
    const sequence = await this.sequenceManager.getCurrentSequence();
    const timeframes = Constants.TIME.SEQUENCE_TYPES.TO_TIMEFRAMES[sequence];

    try {
      await this.tickerManager.startTracking({
        ticker,
        exchange,
        timeframes,
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: new Date().toISOString(),
      });
      Notifier.success(`⏺ Started tracking ${ticker}`);
    } catch (error) {
      Notifier.warn(`Failed to start tracking ${ticker}: ${(error as Error).message}`);
    }
  }
}
