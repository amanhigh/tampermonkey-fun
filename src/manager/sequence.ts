import { Constants } from '../models/constant';
import { TimeFrame } from '../models/trading';
import { ISequenceRepo } from '../repo/sequence';

/**
 * Interface for trading view manager functionality needed by sequence manager
 */
type TradingViewManager = {
  getTicker(): string;
  getExchange(): string;
};

/**
 * Interface for managing sequence operations and state
 */
export interface ISequenceManager {
  /**
   * Gets current sequence considering freeze state
   * @returns Sequence type (MWD or YR)
   */
  getCurrentSequence(): string;

  /**
   * Flips current ticker's sequence between MWD and YR
   */
  flipSequence(): void;

  /**
   * Get timeframe for given sequence and index
   * @param sequence Sequence type (MWD/YR)
   * @param position Position in sequence (0-3)
   * @returns TimeFrame configuration or null
   */
  sequenceToTimeFrame(sequence: string, position: number): TimeFrame | null;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   * @returns Current freeze state after toggle
   */
  freezeSequence(): string | null;
}

/**
 * Manages sequence operations and state for trading view timeframes
 */
export class SequenceManager implements ISequenceManager {
  /**
   * Current freeze sequence state
   * @private
   */
  private _freezeSequence: string | null = null;

  /**
   * @param sequenceRepo Repository for sequence operations
   * @param tvManager Trading view manager
   */
  constructor(
    // HACK: Remove Private Types
    private readonly _sequenceRepo: ISequenceRepo,
    private readonly _tvManager: TradingViewManager
  ) {}

  /** @inheritdoc */
  getCurrentSequence(): string {
    // Return frozen sequence if exists
    if (this._freezeSequence) {
      return this._freezeSequence;
    }

    const ticker = this._tvManager.getTicker();
    const exchange = this._tvManager.getExchange();
    const defaultSequence = this._getDefaultSequence(exchange);

    return this._sequenceRepo.getSequence(ticker, defaultSequence);
  }

  /** @inheritdoc */
  flipSequence(): void {
    const tvTicker = this._tvManager.getTicker();
    const currentSequence = this.getCurrentSequence();

    const sequence =
      currentSequence === Constants.TIME.SEQUENCE_TYPES.HIGH
        ? Constants.TIME.SEQUENCE_TYPES.DEFAULT
        : Constants.TIME.SEQUENCE_TYPES.HIGH;

    void this._sequenceRepo.pinSequence(tvTicker, sequence);
  }

  /** @inheritdoc */
  sequenceToTimeFrame(sequence: string, position: number): TimeFrame | null {
    try {
      const timeFrameName = Constants.TIME.SEQUENCES[sequence][position];
      if (!timeFrameName) return null;
      const config = Constants.TIME.FRAMES[timeFrameName];
      return new TimeFrame(config.symbol, config.style, config.toolbarPosition);
    } catch (error) {
      console.error('Error getting timeframe:', error);
      return null;
    }
  }

  /** @inheritdoc */
  freezeSequence(): string | null {
    if (this._freezeSequence) {
      this._freezeSequence = null;
      message('FreezeSequence Disabled', 'red');
    } else {
      this._freezeSequence = this.getCurrentSequence();
      message(`FreezeSequence: ${this._freezeSequence}`, 'yellow');
    }
    return this._freezeSequence;
  }

  /**
   * Get default sequence based on exchange
   * @private
   * @param exchange Exchange identifier
   * @returns Default sequence (MWD or YR)
   */
  private _getDefaultSequence(exchange: string): string {
    return exchange === Constants.EXCHANGE.TYPES.NSE
      ? Constants.TIME.SEQUENCE_TYPES.DEFAULT // MWD
      : Constants.TIME.SEQUENCE_TYPES.HIGH; // YR
  }
}
