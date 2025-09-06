import { IRepoCron } from './cron';
import { MapRepo, IMapRepo } from './map';
import { SerializedData } from './base';

/**
 * Interface for ticker repository operations
 */
export interface ITickerRepo extends IMapRepo<string, string> {
  /**
   * Get investing ticker for given TV ticker
   * @param tvTicker TradingView ticker
   * @returns Investing ticker if mapped, null if no mapping exists
   */
  getInvestingTicker(tvTicker: string): string | null;

  /**
   * Get TV ticker for given investing ticker
   * @param investingTicker Investing.com ticker
   * @returns TV ticker if mapped, null otherwise
   */
  getTvTicker(investingTicker: string): string | null;

  /**
   * Pin investing ticker mapping and update reverse map
   * @param tvTicker TradingView ticker
   * @param investingTicker Investing.com ticker
   */
  pinInvestingTicker(tvTicker: string, investingTicker: string): void;
}

/**
 * Repository for managing TradingView to Investing.com ticker mappings
 */
export class TickerRepo extends MapRepo<string, string> implements ITickerRepo {
  /**
   * Reverse mapping from investing tickers to TV tickers
   * @private
   */
  private readonly reverseMap: Map<string, string>;

  /**
   * Creates a new ticker repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'tickerRepo');
    this.reverseMap = new Map<string, string>();
  }

  /**
   * @inheritdoc
   */
  protected deserialize(data: SerializedData): Map<string, string> {
    const tickerMap = new Map<string, string>();
    Object.entries(data).forEach(([tvTicker, investingTicker]) => {
      if (typeof investingTicker === 'string') {
        tickerMap.set(tvTicker, investingTicker);
      }
    });
    this.buildReverseMap(tickerMap);
    return tickerMap;
  }

  /**
   * @inheritdoc
   */
  public getInvestingTicker(tvTicker: string): string | null {
    return this.get(tvTicker) || null;
  }

  /**
   * @inheritdoc
   */
  public getTvTicker(investingTicker: string): string | null {
    return this.reverseMap.get(investingTicker) || null;
  }

  /**
   * @inheritdoc
   */
  public pinInvestingTicker(tvTicker: string, investingTicker: string): void {
    this.set(tvTicker, investingTicker);
  }

  /**
   * Rebuilds the reverse ticker map
   * @private
   */
  private buildReverseMap(tickerMap: Map<string, string>): void {
    this.reverseMap.clear();
    tickerMap.forEach((investingTicker, tvTicker) => {
      this.reverseMap.set(investingTicker, tvTicker);
    });
  }

  /**
   * Override set to maintain reverse map
   * @override
   */
  public override set(key: string, value: string): void {
    const oldValue = this.get(key);
    if (oldValue !== undefined && oldValue !== value) {
      this.reverseMap.delete(oldValue);
    }
    super.set(key, value);
    this.reverseMap.set(value, key);
  }

  /**
   * Override delete to maintain reverse map
   * @override
   */
  public override delete(key: string): boolean {
    const value = this.get(key);
    if (value) {
      this.reverseMap.delete(value);
    }
    return super.delete(key);
  }

  /**
   * Override clear to maintain reverse map
   * @override
   */
  public override clear(): void {
    super.clear();
    this.reverseMap.clear();
  }
}
