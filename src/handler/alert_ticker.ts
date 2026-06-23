import { PairInfo } from '../models/alert';
import { ISmartPrompt } from '../util/smart';
import { IInvestingClient } from '../client/investing';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { IDomManager } from '../manager/dom';
import { Notifier } from '../util/notify';
import { TickerManager } from '../manager/ticker';

/**
 * Interface for managing investing.com pair linking operations
 */
export interface IAlertTickerHandler {
  /**
   * Maps a TradingView ticker to Investing.com pair data
   * @param searchQuery The investing.com ticker symbol to search for
   * @param exchange Optional exchange name
   */
  linkInvestingTicker(searchQuery: string, exchange?: string): Promise<void>;
}

/**
 * Handles investing.com pair linking and alert ticker creation.
 *
 * Searches Investing.com for matching pairs, prompts the user to select one,
 * then creates an alert ticker on the backend. The type (PRIMARY/SECONDARY)
 * is auto-selected by the manager.
 */
export class AlertTickerHandler implements IAlertTickerHandler {
  constructor(
    private readonly investingClient: IInvestingClient,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  public async linkInvestingTicker(searchQuery: string, exchange = ''): Promise<void> {
    Notifier.info(`Searching for ${searchQuery} on ${exchange}`);

    const tvTicker = this.domManager.getTicker();

    // FIXME: replace fetchSymbolData (old InvestingClient) with InstrumentClient.getInstruments()
    //        via InvestingManager — this endpoint is legacy; the new public API lives in
    //        src/client/instrument.ts and is already wrapped by src/manager/investing.ts
    const pairs = await this.investingClient.fetchSymbolData(searchQuery);
    const options = this.formatPairOptions(pairs);
    const response = await this.smartPrompt.showModal(options.slice(0, 10));

    if (response.type === 'cancel' || response.type === 'none') {
      return;
    }

    if (response.type === 'reason') {
      const selected = response.value;
      const selectedPair = this.findSelectedPair(pairs, selected);
      if (selectedPair) {
        Notifier.info(`Selected: ${this.formatPair(selectedPair)}`);

        await this.alertTickerManager.linkAlertTicker(tvTicker, {
          symbol: selectedPair.symbol,
          pair_id: selectedPair.pairId,
          name: selectedPair.name,
          exchange: TickerManager.canonicalizeExchange(selectedPair.exchange),
        });
      } else {
        Notifier.warn(`Invalid selection for ${searchQuery} on ${exchange}, cant map Pair.`);
      }
    }
  }

  private formatPairOptions(pairs: PairInfo[]): string[] {
    return pairs.map((pair) => this.formatPair(pair));
  }

  private formatPair(pair: PairInfo): string {
    return `${pair.name} (SYMBOL: ${pair.symbol}, Exchange: ${pair.exchange})`;
  }

  private findSelectedPair(pairs: PairInfo[], selected: string): PairInfo | undefined {
    return pairs.find((pair) => this.formatPair(pair) === selected);
  }
}
