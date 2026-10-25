import { IBarkatClient } from '../client/barkat';
import { BarkatTickerAnalysis } from '../models/barkat';

/**
 * Manager for the read-only Barkat analysis API.
 * Pure pass-through: callers supply the native ticker explicitly.
 */
export interface IBarkatManager {
  /**
   * Get the multi-timeframe analysis for a ticker.
   * No caching, event publication or policy evaluation happens here.
   * @param ticker - Native ticker symbol, no exchange prefix (e.g. "BRK.B")
   * @returns Promise resolving to the analysis payload
   */
  getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis>;
}

/** Pass-through manager over the Barkat analysis client. */
export class BarkatManager implements IBarkatManager {
  /**
   * Creates an instance of BarkatManager.
   * @param barkatClient - Barkat API client
   */
  constructor(private readonly barkatClient: IBarkatClient) {}

  /** @inheritdoc */
  async getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis> {
    return this.barkatClient.getTickerAnalysis(ticker);
  }
}
