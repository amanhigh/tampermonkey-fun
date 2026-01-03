import { AlertAudit, AlertState, AuditStateCounts } from '../models/alert';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
import { ITickerManager } from './ticker';
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
    const alertsPlugin = this.auditRegistry.get('alerts')!;

    // Use plugin's targeted run for single ticker
    const results = alertsPlugin.run([investingTicker]);

    let state: AlertState;
    if (results.length > 0) {
      // Plugin returned a FAIL result; use the code as state
      state = results[0].code as AlertState;
    } else {
      // No results means PASS/VALID state
      state = AlertState.VALID;
    }

    const audit = new AlertAudit(investingTicker, state);
    this.auditRepo.set(investingTicker, audit);
    return audit;
  }

  /** @inheritdoc */
  filterAuditResults(state: AlertState): AlertAudit[] {
    return this.auditRepo.getFilteredAuditResults(state);
  }
}
