import { PairInfo } from '../models/alert';
import { ISmartPrompt } from '../util/smart';
import { IPairManager } from '../manager/pair';
import { Notifier } from '../util/notify';
import { IInvestingClient } from '../client/investing';

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
   * Deletes pair mapping information
   * @param investingTicker The investing.com ticker symbol to unmap
   */
  deletePairInfo(investingTicker: string): void;
}

/**
 * Class handling alert mapping functionality
 */
export class PairHandler implements IPairHandler {
  constructor(
    private readonly investingClient: IInvestingClient,
    private readonly pairManager: IPairManager,
    private readonly smartPrompt: ISmartPrompt
  ) {}

  /**
   * Maps a TradingView ticker to Investing.com pair data
   * @param investingTicker The TradingView ticker symbol
   * @param exchange Optional exchange name
   */
  public async mapInvestingTicker(investingTicker: string, exchange = ''): Promise<void> {
    Notifier.info(`Searching for ${investingTicker} on ${exchange}`);

    try {
      const pairs = await this.investingClient.fetchSymbolData(investingTicker);
      const options = this.formatPairOptions(pairs);
      const selected = await this.smartPrompt.showModal(options.slice(0, 10));

      if (!selected) {
        Notifier.error('No selection made. Operation cancelled.');
        return;
      }

      const selectedPair = this.findSelectedPair(pairs, selected);
      if (selectedPair) {
        Notifier.info(`Selected: ${this.formatPair(selectedPair)}`);
        this.pairManager.createInvestingToPairMapping(investingTicker, selectedPair);
        return;
      }

      Notifier.error('Invalid selection.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(`Error mapping alert: ${message}`);
      throw error;
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
    // XXX: pair.symbol is needed ?
    return `${pair.name} (ID: ${pair.pairId}, Exchange: ${pair.exchange})`;
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
   * Deletes pair mapping information
   * @param investingTicker The investing.com ticker symbol to unmap
   */
  public deletePairInfo(investingTicker: string): void {
    this.pairManager.deletePairInfo(investingTicker);
    Notifier.success(`Unmapped ${investingTicker}`);
  }
}
