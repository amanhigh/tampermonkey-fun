import { IRepoCron } from './cron';
import { MapRepo, IMapRepo } from './map';
import { SerializedData } from './base';
import { SequenceType } from '../models/trading';

/**
 * Interface for sequence repository operations
 */
export interface ISequenceRepo extends IMapRepo<string, SequenceType> {
  /**
   * Get sequence for given TV ticker
   * @param tvTicker TradingView ticker
   * @param defaultSequence Sequence to use if not mapped
   * @returns Sequence type (MWD or YR)
   */
  getSequence(tvTicker: string, defaultSequence: SequenceType): SequenceType;

  /**
   * Pin sequence for TV ticker
   * @param tvTicker TradingView ticker
   * @param sequence Sequence type
   */
  pinSequence(tvTicker: string, sequence: SequenceType): void;
}

/**
 * Repository for managing sequence preferences
 * Stores custom sequence settings for specific tickers
 * Determines timeframe analysis pattern (MWD or YR)
 */
export class SequenceRepo extends MapRepo<string, SequenceType> implements ISequenceRepo {
  /**
   * Creates a new sequence repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'sequenceRepo');
  }

  /**
   * @inheritdoc
   */
  protected deserialize(data: SerializedData): Map<string, SequenceType> {
    const sequenceMap = new Map<string, SequenceType>();
    Object.entries(data).forEach(([ticker, sequence]) => {
      if (this._isValidSequence(sequence as string)) {
        sequenceMap.set(ticker, sequence as SequenceType);
      }
    });
    return sequenceMap;
  }

  /**
   * Validates if the given string is a valid SequenceType
   * @param sequence Sequence to validate
   * @returns True if sequence matches enum values
   * @private
   */
  private _isValidSequence(sequence: string): sequence is SequenceType {
    return sequence === SequenceType.MWD || sequence === SequenceType.YR;
  }

  /**
   * @inheritdoc
   */
  public getSequence(tvTicker: string, defaultSequence: SequenceType): SequenceType {
    return this.get(tvTicker) ?? defaultSequence;
  }

  /**
   * @inheritdoc
   */
  public pinSequence(tvTicker: string, sequence: SequenceType): void {
    this.set(tvTicker, sequence);
  }
}
