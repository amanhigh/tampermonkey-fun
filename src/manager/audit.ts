import { AlertAudit, AlertState, AuditStateCounts } from '../models/alert';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
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
  private readonly batchSize: number;

  private stateCounts: AuditStateCounts;

  constructor(
    private readonly auditRepo: IAuditRepo,
    private readonly tickerManager: ITickerManager,
    private readonly pairManager: IPairManager,
    private readonly alertManager: IAlertManager,
    batchSize = 50
  ) {
    this.batchSize = batchSize;
    this.stateCounts = new AuditStateCounts();
  }

  /********** Public Methods **********/

  /** @inheritdoc */
  async auditAlerts(): Promise<void> {
    const investingTickers = this.pairManager.getAllInvestingTickers();
    this.auditRepo.clear();
    this.stateCounts = new AuditStateCounts();
    await this.processBatch(investingTickers);
    Notifier.message(this.getAuditSummary(), Color.PURPLE, 10000);
  }

  getAuditSummary(): string {
    return this.stateCounts.getFormattedSummary();
  }

  /** @inheritdoc */
  auditCurrentTicker(): AlertAudit {
    const investingTicker = this.tickerManager.getInvestingTicker();
    const state = this.auditAlertState(investingTicker);
    const audit = new AlertAudit(investingTicker, state);
    this.auditRepo.set(investingTicker, audit);
    return audit;
  }

  /** @inheritdoc */
  filterAuditResults(state: AlertState): AlertAudit[] {
    return this.auditRepo.getFilteredAuditResults(state);
  }

  /********** Private Methods **********/

  /**
   * Processes batches of tickers for auditing.
   * @param investingTickers - The list of tickers to process.
   * @private
   */
  private async processBatch(investingTickers: string[]): Promise<void> {
    let processedCount = 0;

    // Process in batches
    while (processedCount < investingTickers.length) {
      // Calculate batch bounds
      const endIndex = Math.min(processedCount + this.batchSize, investingTickers.length);

      // Process current batch
      for (let i = processedCount; i < endIndex; i++) {
        const investingTicker = investingTickers[i];
        const state = this.auditAlertState(investingTicker);
        this.stateCounts.increment(state);
        this.auditRepo.set(investingTicker, new AlertAudit(investingTicker, state));
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
    const auditCount = this.auditRepo.getCount();
    Notifier.message(`Audited ${auditCount} out of ${investingTickers.length}`, Color.PURPLE, 5000);
  }

  /**
   * Audits alerts for a single ticker.
   * @param investingTicker - The ticker to audit.
   * @returns The audit state for the ticker.
   * @private
   */
  private auditAlertState(investingTicker: string): AlertState {
    const pairInfo = this.pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      return AlertState.NO_ALERTS;
    }

    const alerts = this.alertManager.getAlertsForInvestingTicker(investingTicker);
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
