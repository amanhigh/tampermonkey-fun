import { AlertAudit, AlertState } from '../models/alert';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IPairManager } from './pair';
import { IAlertManager } from './alert';
import { IAuditRepo } from '../repo/audit';

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
  auditCurrentTicker(): AlertAudit;

  /**
   * Filters audit results by state
   * @param state Alert state to filter by
   * @returns Filtered audit results
   * @private
   * */
  filterAuditResults(state: AlertState): AlertAudit[];
}

/**
 * Class representing the Audit Manager.
 */
export class AuditManager implements IAuditManager {
  private _currentIndex: number;
  private readonly _batchSize: number;

  constructor(
    private readonly _auditRepo: IAuditRepo,
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
    const investingTickers = this._pairManager.getAllInvestingTickers();
    this._currentIndex = 0;
    Notifier.info(`Starting audit of ${investingTickers.length} tickers`);
    this._auditRepo.clear();
    await this._processBatch(investingTickers);
  }

  /** @inheritdoc */
  auditCurrentTicker(): AlertAudit {
    const investingTicker = this._tickerManager.getInvestingTicker();
    const state = this.auditAlertState(investingTicker);
    const audit = new AlertAudit(investingTicker, state);
    this._auditRepo.set(investingTicker, audit);
    return audit;
    // this._uiManager.refreshAuditButton(investingTicker, state); TODO: Move to Handler
  }

  /** @inheritdoc */
  filterAuditResults(state: AlertState): AlertAudit[] {
    return this._auditRepo.getFilteredAuditResults(state);
  }

  /********** Private Methods **********/

  /**
   * Processes batches of tickers for auditing.
   * @param investingTickers - The list of tickers to process.
   * @private
   */
  private async _processBatch(investingTickers: string[]): Promise<void> {
    while (this._currentIndex < investingTickers.length) {
      const endIndex = Math.min(this._currentIndex + this._batchSize, investingTickers.length);
      const batchPercent = Math.floor((this._currentIndex / investingTickers.length) * 100);

      if (batchPercent % 20 === 0) {
        Notifier.info(`Processed ${batchPercent}% of tickers`);
      }

      // Process current batch asynchronously
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          for (let i = this._currentIndex; i < endIndex; i++) {
            const investingTicker = investingTickers[i];
            const state = this.auditAlertState(investingTicker);
            this._auditRepo.set(investingTicker, new AlertAudit(investingTicker, state));
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
  private auditAlertState(investingTicker: string): AlertState {
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      return AlertState.NO_ALERTS;
    }

    const alerts = this._alertManager.getAlertsForInvestingTicker(investingTicker);
    if (!alerts) {
      return AlertState.NO_PAIR;
    }

    return alerts.length === 0
      ? AlertState.NO_ALERTS
      : alerts.length === 1
        ? AlertState.SINGLE_ALERT
        : AlertState.VALID;
  }
}
