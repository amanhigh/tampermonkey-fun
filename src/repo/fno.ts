import { IRepoCron } from './cron';
import { SetRepo, ISetRepo } from './set';

/**
 * Interface for FNO repository operations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IFnoRepo extends ISetRepo<string> {
  // Using base SetRepo methods
}

/**
 * Repository for managing futures and options symbols
 * Moved from Constants.EXCHANGE.FNO_SYMBOLS for dynamic storage
 */
export class FnoRepo extends SetRepo<string> implements IFnoRepo {
  /**
   * Creates a new FNO repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'fnoRepo');
    // Initialize with existing FNO symbols if empty
    if (this.getCount() === 0) {
      // TODO: Populate with existing FNO symbols
      this._initializeDefaultSymbols();
    }
  }

  /**
   * Initializes repository with default FNO symbols
   * @private
   */
  private _initializeDefaultSymbols(): void {
    ['ASIANPAINT', 'AXISBANK', 'BAJAJ_AUTO'].forEach((symbol) => this.add(symbol));
  }
}
