import { AlertAudit, AlertState, AuditStateCounts } from '../models/alert';
import { ITickerManager } from './ticker';
import { IAuditRepo } from '../repo/audit';
import type { AuditRegistry } from '../audit/registry';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * Interface for Audit management operations
 */
export interface IAuditManager {
  /**
   * Initiates the auditing process for all alerts
   * @returns State counts for audit results (for notification/summary)
   */
  auditAlerts(): Promise<AuditStateCounts>;

  /**
   * Audits the current ticker and updates its state
   */
  auditCurrentTicker(): Promise<AlertAudit>;

  /**
   * Filters audit results by state
   * @param state Alert state to filter by
   * @returns Filtered audit results
   */
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
  async auditAlerts(): Promise<AuditStateCounts> {
    // Always use registry-backed AlertsAudit plugin
    const alertsPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ALERTS);

    this.auditRepo.clear();
    this.stateCounts = new AuditStateCounts();

    const results = await alertsPlugin.run();
    // Save ALL FAIL results (NO_PAIR, NO_ALERTS, SINGLE_ALERT)
    // Previously filtered out NO_PAIR, but that was a bug
    results.forEach((r) => {
      const state = r.code as AlertState;
      this.stateCounts.increment(state);
      this.auditRepo.set(r.target, new AlertAudit(r.target, state));
    });

    return this.stateCounts;
  }

  /** @inheritdoc */
  async auditCurrentTicker(): Promise<AlertAudit> {
    const investingTicker = this.tickerManager.getInvestingTicker();
    const alertsPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ALERTS);

    // Use plugin's targeted run for single ticker
    const results = await alertsPlugin.run([investingTicker]);

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
