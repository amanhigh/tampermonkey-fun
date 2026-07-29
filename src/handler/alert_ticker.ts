import { ISmartPrompt, SmartPromptResponseType } from '../util/smart';
import { IInvestingManager } from '../manager/investing';
import { Instrument } from '../models/investing';
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
    private readonly investingManager: IInvestingManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  public async linkInvestingTicker(searchQuery: string, exchange = ''): Promise<void> {
    Notifier.info(`Searching for ${searchQuery} on ${exchange}`);

    const tvTicker = this.domManager.getTicker();

    const instruments = await this.investingManager.searchInstruments(searchQuery);
    const options = this.formatInstrumentOptions(instruments);
    const response = await this.smartPrompt.showModal(options.slice(0, 10));

    if (response.type === SmartPromptResponseType.CANCEL || response.type === SmartPromptResponseType.NONE) {
      return;
    }

    if (response.type === SmartPromptResponseType.SELECTED) {
      const selected = response.primarySelection;
      const selectedInstrument = this.findSelectedInstrument(instruments, selected);
      if (selectedInstrument) {
        Notifier.info(`Selected: ${this.formatInstrument(selectedInstrument)}`);

        await this.alertTickerManager.linkAlertTicker(tvTicker, {
          symbol: selectedInstrument.symbol,
          pair_id: selectedInstrument.id.toString(),
          name: selectedInstrument.description,
          exchange: TickerManager.canonicalizeExchange(selectedInstrument.exchange),
        });
      } else {
        Notifier.warn(`Invalid selection for ${searchQuery} on ${exchange}, cant map Pair.`);
      }
    }
  }

  private formatInstrumentOptions(instruments: Instrument[]): string[] {
    return instruments.map((instrument) => this.formatInstrument(instrument));
  }

  private formatInstrument(instrument: Instrument): string {
    return `${instrument.description} (SYMBOL: ${instrument.symbol}, Exchange: ${instrument.exchange})`;
  }

  private findSelectedInstrument(instruments: Instrument[], selected: string): Instrument | undefined {
    return instruments.find((instrument) => this.formatInstrument(instrument) === selected);
  }
}
