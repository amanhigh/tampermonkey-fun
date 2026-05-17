import { Constants } from '../models/constant';
import { TimeFrameConfig, SequenceType, TimeFrame } from '../models/trading';
import { ITickerClient } from '../client/ticker';
import { TickerTimeframe } from '../models/ticker';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
import { ITickerManager } from './ticker';

/**
 * Interface for managing sequence operations and state
 */
export interface ISequenceManager {
  /**
   * Gets current sequence considering freeze state.
   * Reads from backend ticker timeframes: has DL => MWD, otherwise YR.
   * Falls back by exchange if backend read fails.
   * @returns Promise resolving to SequenceType (MWD or YR)
   */
  getCurrentSequence(): Promise<SequenceType>;

  /**
   * Flips current ticker's sequence between MWD and YR.
   * Persists new timeframes to backend.
   */
  flipSequence(): Promise<void>;

  /**
   * Get timeframe for given sequence and index
   * @param sequence Sequence type (MWD/YR)
   * @param position Position in sequence (0-3)
   * @returns TimeFrame configuration or null
   */
  sequenceToTimeFrameConfig(sequence: SequenceType, position: number): TimeFrameConfig;

  /**
   * Toggles sequence freeze state.
   * Uses current sequence when enabling freeze.
   */
  toggleFreezeSequence(): Promise<void>;
}

/**
 * Maps a SequenceType to the ordered backend timeframe list.
 */
const SEQUENCE_TO_TIMEFRAMES: Record<SequenceType, TickerTimeframe[]> = {
  [SequenceType.MWD]: ['MN', 'WK', 'DL'],
  [SequenceType.YR]: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
};

/**
 * Manages sequence operations and state for trading view timeframes.
 * Reads sequence from backend ticker timeframes.
 * No local cache — direct backend reads on every call.
 */
export class SequenceManager implements ISequenceManager {
  /**
   * Current freeze sequence state
   * @private
   */
  private _frozenSequence: SequenceType | null = null;

  /**
   * @param tickerClient Client for backend ticker operations
   * @param tickerManager Ticker manager for current ticker info
   */
  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly tickerManager: ITickerManager
  ) {}

  /** @inheritdoc */
  async getCurrentSequence(): Promise<SequenceType> {
    // Return frozen sequence if exists
    if (this._frozenSequence !== null) {
      return this._frozenSequence;
    }

    const ticker = this.tickerManager.getTicker();

    try {
      const record = await this.tickerClient.getTicker(ticker);
      return record.timeframes.includes('DL' as TickerTimeframe) ? SequenceType.MWD : SequenceType.YR;
    } catch (error) {
      Notifier.warn(`getCurrentSequence: ${(error as Error).message}. Defaulting to MWD.`);
      return SequenceType.MWD;
    }
  }

  /** @inheritdoc */
  async flipSequence(): Promise<void> {
    const tvTicker = this.tickerManager.getTicker();
    const currentSequence = await this.getCurrentSequence();
    const sequence = currentSequence === SequenceType.YR ? SequenceType.MWD : SequenceType.YR;
    const newTimeframes = SEQUENCE_TO_TIMEFRAMES[sequence];

    // Persist to backend — updateTicker merges with current record internally
    try {
      await this.tickerClient.updateTicker(tvTicker, { timeframes: newTimeframes });
    } catch (error) {
      Notifier.warn(`flipSequence: ${(error as Error).message}. Skipping backend persistence.`);
    }
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
  async toggleFreezeSequence(): Promise<void> {
    if (this._frozenSequence !== null) {
      this._frozenSequence = null;
      Notifier.red('🚫 FreezeSequence Disabled');
    } else {
      this._frozenSequence = await this.getCurrentSequence();
      Notifier.message(`FreezeSequence: ${this._frozenSequence}`, Color.ROYAL_BLUE);
    }
  }
}
