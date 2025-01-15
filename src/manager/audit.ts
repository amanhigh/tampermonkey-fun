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
  private readonly _batchSize: number;

  constructor(
    private readonly _auditRepo: IAuditRepo,
    private readonly _tickerManager: ITickerManager,
    private readonly _pairManager: IPairManager,
    private readonly _alertManager: IAlertManager,
    batchSize = 50
  ) {
    this._batchSize = batchSize;
  }

  /********** Public Methods **********/

  /** @inheritdoc */
  async auditAlerts(): Promise<void> {
    const investingTickers = this._pairManager.getAllInvestingTickers();
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
    let processedCount = 0;

    // Process in batches
    while (processedCount < investingTickers.length) {
      // Calculate batch bounds
      const endIndex = Math.min(processedCount + this._batchSize, investingTickers.length);

      // Process current batch
      for (let i = processedCount; i < endIndex; i++) {
        const investingTicker = investingTickers[i];
        const state = this.auditAlertState(investingTicker);
        this._auditRepo.set(investingTicker, new AlertAudit(investingTicker, state));
      }

      processedCount = endIndex;
      const progress = Math.floor((processedCount / investingTickers.length) * 100);
      if (progress % 20 === 0) {
        // BUG: Show progress at 20% intervals
      }

      // Yield to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Final status
    const auditCount = this._auditRepo.getCount();
    Notifier.message(`Audited ${auditCount} out of ${investingTickers.length}`, 'purple', 5000);
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
