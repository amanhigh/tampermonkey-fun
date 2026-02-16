import { PairInfo } from '../models/alert';
import { ISmartPrompt } from '../util/smart';
import { IPairManager } from '../manager/pair';
import { IInvestingClient } from '../client/investing';
import { ISymbolManager } from '../manager/symbol';
import { IStyleManager } from '../manager/style';
import { ITickerManager } from '../manager/ticker';
import { IWatchListHandler } from './watchlist';
import { Notifier } from '../util/notify';

/**
 * Interface for managing alert mapping operations
 */
export interface IPairHandler {
  /**
   * Maps a TradingView ticker to Investing.com pair data
   * @param investingTicker The investing.com ticker symbol
   * @param exchange Optional exchange name
   */
  mapInvestingTicker(investingTicker: string, exchange?: string): Promise<void>;

  /**
   * Stops tracking an investing ticker — full cascade cleanup + UI notification
   * @param investingTicker The investing.com ticker symbol to stop tracking
   */
  stopTrackingByInvestingTicker(investingTicker: string): void;

  /**
   * Stops tracking a TV ticker — resolves and performs full cascade cleanup + UI notification
   * @param tvTicker The TradingView ticker to stop tracking
   */
  stopTrackingByTvTicker(tvTicker: string): void;
}

/**
 * Class handling alert mapping functionality
 */
export class PairHandler implements IPairHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly investingClient: IInvestingClient,
    private readonly pairManager: IPairManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly watchListHandler: IWatchListHandler,
    private readonly styleManager: IStyleManager
  ) {}

  /**
   * Maps a TradingView ticker to Investing.com pair data
   * @param searchQuery The Ticker Symbol or Security Name
   * @param exchange Optional exchange name
   */
  public async mapInvestingTicker(searchQuery: string, exchange = ''): Promise<void> {
    Notifier.info(`Searching for ${searchQuery} on ${exchange}`);

    const pairs = await this.investingClient.fetchSymbolData(searchQuery);
    const options = this.formatPairOptions(pairs);
    const selected = await this.smartPrompt.showModal(options.slice(0, 10));

    if (!selected) {
      Notifier.warn(`Invalid selection for ${searchQuery} on ${exchange}, cant map Pair.`);
      return;
    }

    const selectedPair = this.findSelectedPair(pairs, selected);
    if (selectedPair) {
      Notifier.info(`Selected: ${this.formatPair(selectedPair)}`);

      if (!this.checkGuardRails(selectedPair)) {
        return;
      }

      this.pairManager.createInvestingToPairMapping(selectedPair.symbol, selectedPair);
      this.symbolManager.createTvToInvestingMapping(this.tickerManager.getTicker(), selectedPair.symbol);
      return;
    }
  }

  /**
   * Formats pair data for display
   * @param pairs Array of pair objects
   * @returns Formatted strings
   * @private
   */
  private formatPairOptions(pairs: PairInfo[]): string[] {
    return pairs.map((pair) => this.formatPair(pair));
  }

  private formatPair(pair: PairInfo): string {
    return `${pair.name} (SYMBOL: ${pair.symbol}, Exchange: ${pair.exchange})`;
  }

  /**
   * Finds selected pair from formatted string
   * @param pairs Array of pair objects
   * @param selected Selected formatted string
   * @returns Selected pair object
   * @private
   */
  private findSelectedPair(pairs: PairInfo[], selected: string): PairInfo | undefined {
    return pairs.find((pair) => this.formatPair(pair) === selected);
  }

  /**
   * Stops tracking an investing ticker — full cascade cleanup + UI notification
   * @param investingTicker The investing.com ticker symbol to stop tracking
   */
  public stopTrackingByInvestingTicker(investingTicker: string): void {
    // Clear chart drawings if currently viewing the ticker being untracked
    this.clearChartIfCurrentTicker(investingTicker);

    const cleanedFromLists = this.pairManager.stopTrackingByInvestingTicker(investingTicker);

    if (cleanedFromLists) {
      this.watchListHandler.onWatchListChange();
    }

    Notifier.success(`⏹ Stopped tracking ${investingTicker}`);
  }

  /**
   * Stops tracking a TV ticker — resolves and performs full cascade cleanup + UI notification
   * @param tvTicker The TradingView ticker to stop tracking
   */
  public stopTrackingByTvTicker(tvTicker: string): void {
    // Clear chart drawings if currently viewing the ticker being untracked
    if (this.tickerManager.getTicker() === tvTicker) {
      this.styleManager.clearAll();
    }

    const cleanedFromLists = this.pairManager.stopTrackingByTvTicker(tvTicker);

    if (cleanedFromLists) {
      this.watchListHandler.onWatchListChange();
    }

    Notifier.success(`⏹ Stopped tracking ${tvTicker}`);
  }

  /**
   * Validates guard rails before creating a pair mapping.
   * Delegates to PairManager for business logic.
   * @param selectedPair The pair info to validate
   * @returns True if mapping should proceed, false if blocked
   */
  private checkGuardRails(selectedPair: PairInfo): boolean {
    const tvTicker = this.tickerManager.getTicker();
    return this.pairManager.checkGuardRails(selectedPair, tvTicker);
  }

  /**
   * Clears chart drawings if the current chart shows a ticker mapped to the investing ticker
   * @param investingTicker Investing.com ticker being untracked
   */
  private clearChartIfCurrentTicker(investingTicker: string): void {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    if (this.tickerManager.getTicker() === tvTicker) {
      this.styleManager.clearAll();
    }
  }
}
