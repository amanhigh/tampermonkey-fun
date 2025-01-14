import { ITickerHandler } from './ticker';
import { IAlertHandler } from './alert';
import { IFnoManager } from '../manager/fno';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';

/**
 * Interface for managing command input operations
 */
export interface ICommandInputHandler {
  /**
   * Unified handler for all input changes/submissions:
   * - Quick ticker opening with "xox" suffix (e.g "HDFC xox")
   * - Price list for alerts (e.g "100.5 102.3")
   * - Command format (e.g "E=NSE")
   * @param e Input event (keyboard/change)
   */
  handleInput(e: JQuery.TriggeredEvent): Promise<void>;
}

type InputType = 'TICKER' | 'PRICES' | 'COMMAND' | 'UNKNOWN';

interface InputProcessor {
  type: InputType;
  value: string;
}

/**
 * Handles all input-related events and validations
 */
export class CommandInputHandler implements ICommandInputHandler {
  private readonly ENTER_KEY_CODE = 13;
  private readonly TICKER_SUFFIX = 'xox';

  constructor(
    private readonly tickerHandler: ITickerHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly fnoManager: IFnoManager
  ) {}

  /** @inheritdoc */
  public async handleInput(e: JQuery.TriggeredEvent): Promise<void> {
    const input = $(e.target).val();
    if (typeof input !== 'string') {
      return;
    }

    const processor = this.determineInputType(input);

    // Only require Enter key for non-ticker inputs
    if (processor.type !== 'TICKER') {
      const keyEvent = e as JQuery.KeyDownEvent;
      if (!this.isEnterKey(keyEvent)) {
        return;
      }
    }
    try {
      switch (processor.type) {
        case 'TICKER':
          this.processTickerInput(processor.value);
          break;
        case 'PRICES':
          await this.processPriceInput(processor.value);
          break;
        case 'COMMAND':
          const [action, value] = processor.value.split('=');
          if (['FNO', 'FNO!', 'FNO-'].includes(action.toUpperCase())) {
            this.processFnoCommand(action.toUpperCase(), value);
          } else {
            this.tickerHandler.processCommand(processor.value);
          }
          break;
        default:
          this.displayHelpMessage();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  private determineInputType(value: string): InputProcessor {
    // HACK: Improved Ends With Symbol
    if (this.hasTickerSuffix(value)) {
      return {
        type: 'TICKER',
        value: this.extractTickerFromInput(value),
      };
    }

    // Check for command format (action=value)
    if (value.includes('=')) {
      return {
        type: 'COMMAND',
        value,
      };
    }

    // Check for space separated numbers (prices)
    if (this.isPriceList(value)) {
      return {
        type: 'PRICES',
        value,
      };
    }

    return {
      type: 'UNKNOWN',
      value,
    };
  }

  private processTickerInput(ticker: string): void {
    this.tickerHandler.openTicker(ticker);
    this.clearInputField();
  }

  private async processPriceInput(input: string): Promise<void> {
    await this.alertHandler.createAlertsFromTextBox(input);
  }

  private isPriceList(value: string): boolean {
    return value.split(' ').every((item) => !isNaN(parseFloat(item)));
  }

  private hasTickerSuffix(value: string): boolean {
    return value.endsWith(this.TICKER_SUFFIX);
  }

  private extractTickerFromInput(value: string): string {
    return value.substring(0, value.length - this.TICKER_SUFFIX.length);
  }

  private clearInputField(): void {
    $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val('');
  }

  private isEnterKey(e: JQuery.KeyDownEvent): boolean {
    return e.keyCode === this.ENTER_KEY_CODE;
  }

  private processFnoCommand(command: string, value: string): void {
    // Convert comma-separated tickers to Set
    const tickers = new Set(value.split(',').map((t) => t.trim()));

    if (command === 'FNO') {
      this.fnoManager.add(tickers);
      Notifier.success(`Added FNO tickers. Total: ${this.fnoManager.getCount()}`);
    } else if (command === 'FNO!') {
      this.fnoManager.clear();
      this.fnoManager.add(tickers);
      Notifier.success(`Replaced FNO tickers. Total: ${this.fnoManager.getCount()}`);
    } else if (command === 'FNO-') {
      this.fnoManager.remove(tickers);
      Notifier.success(`Removed FNO tickers. Total: ${this.fnoManager.getCount()}`);
    }
  }

  private displayHelpMessage(): void {
    // XXX: Update and Beautify Help Message
    const help = `
Input Formats:
- Quick Ticker: TICKER${this.TICKER_SUFFIX}
- Price Alerts: 100.5 102.3
- Commands:
  * E=NSE (Exchange)
  * FNO=TICKER1,TICKER2 (Add FNO)
  * FNO!=TICKER1,TICKER2 (Replace FNO)
  * FNO-=TICKER1,TICKER2 (Remove FNO)
`;
    Notifier.info(help);
  }
}
