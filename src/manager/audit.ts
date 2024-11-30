import { AlertState } from '../models/alert';
import { ISymbolManager } from './symbol';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IPairManager } from './pair';
import { IAlertManager } from './alert';
import { IAuditRepo } from '../repo/audit';

/**
 * Interface for managing audit UI operations
 */
interface IAuditUIManager {
  refreshAuditButton(ticker: string, state: AlertState): void;
  updateAuditSummary(): void;
}

/**
 * Interface for Audit management operations
 */
export interface IAuditManager {
  /**
   * Initiates the auditing process for all alerts
   */
  auditAlerts(): Promise<void>;

  /**
   * Audits the current ticker and updates its state
   */
  auditCurrentTicker(): void;
}

/**
 * Class representing the Audit Manager.
 */
export class AuditManager implements IAuditManager {
  private _currentIndex: number;
  private readonly _batchSize: number;

  constructor(
    private readonly _auditRepo: IAuditRepo,
    private readonly _uiManager: IAuditUIManager,
    private readonly _symbolManager: ISymbolManager,
    private readonly _tickerManager: ITickerManager,
    private readonly _pairManager: IPairManager,
    private readonly _alertManager: IAlertManager,
    batchSize = 50
  ) {
    this._currentIndex = 0;
    this._batchSize = batchSize;
  }

  /********** Public Methods **********/

  /** @inheritdoc */
  async auditAlerts(): Promise<void> {
    const tickers = this._pairManager.getAllInvestingTickers();
    this._currentIndex = 0;
    Notifier.info(`Starting audit of ${tickers.length} tickers`);
    this._auditRepo.clear();
    await this._processBatch(tickers);
  }

  /** @inheritdoc */
  auditCurrentTicker(): void {
    const investingTicker = this._tickerManager.getInvestingTicker();
    const state = this._auditTickerAlerts(investingTicker);
    this._auditRepo.addAuditResult(investingTicker, state);
    // this._uiManager.refreshAuditButton(investingTicker, state); TODO: Move to Handler
  }

  /********** Private Methods **********/

  /**
   * Processes batches of tickers for auditing.
   * @param tickers - The list of tickers to process.
   * @private
   */
  private async _processBatch(tickers: string[]): Promise<void> {
    while (this._currentIndex < tickers.length) {
      const endIndex = Math.min(this._currentIndex + this._batchSize, tickers.length);
      const batchPercent = Math.floor((this._currentIndex / tickers.length) * 100);

      if (batchPercent % 20 === 0) {
        Notifier.info(`Processed ${batchPercent}% of tickers`);
      }

      // Process current batch asynchronously
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          for (let i = this._currentIndex; i < endIndex; i++) {
            const ticker = tickers[i];
            const state = this._auditTickerAlerts(ticker);
            this._auditRepo.addAuditResult(ticker, state);
          }
          resolve();
        }, 0);
      });

      this._currentIndex = endIndex;
    }

    const auditCount = this._auditRepo.getCount();
    Notifier.message(`Completed audit of ${auditCount} tickers`, 'green');
    // this._uiManager.updateAuditSummary(); TODO: Move to Handler
  }

  /**
   * Audits alerts for a single ticker.
   * @param investingTicker - The ticker to audit.
   * @returns The audit state for the ticker.
   * @private
   */
  private _auditTickerAlerts(investingTicker: string): AlertState {
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      return AlertState.NO_ALERTS;
    }

    const alerts = this._alertManager.getAlertsForInvestingTicker(investingTicker);

    return alerts.length === 0
      ? AlertState.NO_ALERTS
      : alerts.length === 1
        ? AlertState.SINGLE_ALERT
        : AlertState.VALID;
  }
}
