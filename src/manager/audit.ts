import { AlertAudit, AlertState, AuditStateCounts } from '../models/alert';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
import { ITickerManager } from './ticker';
import { IPairManager } from './pair';
import { IAlertManager } from './alert';
import { IAuditRepo } from '../repo/audit';
import type { AuditRegistry } from '../audit/registry';

/**
 * Interface for Audit management operations
 */
export interface IAuditManager {
  /**
   * Initiates the auditing process for all alerts
   */
  auditAlerts(): void;

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
  private stateCounts: AuditStateCounts;

  constructor(
    private readonly auditRepo: IAuditRepo,
    private readonly tickerManager: ITickerManager,
    private readonly pairManager: IPairManager,
    private readonly alertManager: IAlertManager,
    private readonly auditRegistry: AuditRegistry
  ) {
    this.stateCounts = new AuditStateCounts();
  }

  /********** Public Methods **********/

  /** @inheritdoc */
  auditAlerts(): void {
    // Always use registry-backed AlertsAudit plugin
    const alertsPlugin = this.auditRegistry.get('alerts')!;

    this.auditRepo.clear();
    this.stateCounts = new AuditStateCounts();

    const results = alertsPlugin.run();
    results
      .filter((r) => r.code === AlertState.NO_ALERTS || r.code === AlertState.SINGLE_ALERT)
      .forEach((r) => {
        const state = r.code as AlertState;
        this.stateCounts.increment(state);
        this.auditRepo.set(r.target, new AlertAudit(r.target, state));
      });

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
