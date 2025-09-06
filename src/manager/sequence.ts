import { Constants } from '../models/constant';
import { TimeFrameConfig, SequenceType, TimeFrame } from '../models/trading';
import { ISequenceRepo } from '../repo/sequence';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
import { ITickerManager } from './ticker';

/**
 * Interface for managing sequence operations and state
 */
export interface ISequenceManager {
  /**
   * Gets current sequence considering freeze state
   * @returns Sequence type (MWD or YR)
   */
  getCurrentSequence(): SequenceType;

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
  sequenceToTimeFrameConfig(sequence: SequenceType, position: number): TimeFrameConfig;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   * @returns Current freeze state after toggle
   */
  toggleFreezeSequence(): void;
}

/**
 * Manages sequence operations and state for trading view timeframes
 */
export class SequenceManager implements ISequenceManager {
  /**
   * Current freeze sequence state
   * @private
   */
  private _frozenSequence: SequenceType | null = null;

  /**
   * @param sequenceRepo Repository for sequence operations
   * @param tvManager Trading view manager
   * @param tickerManager Ticker manager
   */
  constructor(
    private readonly sequenceRepo: ISequenceRepo,
    private readonly tickerManager: ITickerManager
  ) {}

  /** @inheritdoc */
  getCurrentSequence(): SequenceType {
    // Return frozen sequence if exists
    if (this._frozenSequence !== null) {
      return this._frozenSequence;
    }

    const ticker = this.tickerManager.getTicker();
    const exchange = this.tickerManager.getCurrentExchange();
    const defaultSequence = this._getDefaultSequence(exchange);

    return this.sequenceRepo.getSequence(ticker, defaultSequence);
  }

  /** @inheritdoc */
  flipSequence(): void {
    const tvTicker = this.tickerManager.getTicker();
    const currentSequence = this.getCurrentSequence();
    const sequence = currentSequence === SequenceType.YR ? SequenceType.MWD : SequenceType.YR;
    void this.sequenceRepo.pinSequence(tvTicker, sequence);
  }

  /** @inheritdoc */
  sequenceToTimeFrameConfig(sequence: SequenceType, position: number): TimeFrameConfig {
    const frameName = Constants.TIME.SEQUENCE_TYPES.SEQUENCES[sequence][position];
    if (!frameName) {
      throw new Error(`Invalid sequence or position: sequence=${sequence}, position=${position}`);
    }
    const config = Constants.TIME.SEQUENCE_TYPES.FRAMES[frameName as TimeFrame];
    if (!config) {
      throw new Error(`Invalid frame name for Timeframe Config: ${frameName}`);
    }
    return config;
  }

  /** @inheritdoc */
  toggleFreezeSequence(): void {
    if (this._frozenSequence !== null) {
      this._frozenSequence = null;
      Notifier.red('🚫 FreezeSequence Disabled');
    } else {
      this._frozenSequence = this.getCurrentSequence();
      Notifier.message(`FreezeSequence: ${this._frozenSequence}`, Color.ROYAL_BLUE);
    }
  }

  /**
   * Get default sequence based on exchange
   * @private
   * @param exchange Exchange identifier
   * @returns Default sequence (MWD or YR)
   */
  private _getDefaultSequence(exchange: string): SequenceType {
    return exchange === Constants.EXCHANGE.TYPES.NSE ? SequenceType.MWD : SequenceType.YR;
  }
}
