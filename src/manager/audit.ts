import { AlertAudit, AlertState } from '../models/alert';
import type { AuditResult } from '../models/audit';
import { IAuditRepo } from '../repo/audit';

/**
 * Interface for Audit repository operations
 * Manager handles all repo interactions (encapsulates data layer)
 */
export interface IAuditManager {
  /**
   * Resets audit data: clears all previous results and saves new batch
   * Used when auditing all tickers at once
   * @param results Raw audit results from plugin
   */
  resetAuditResults(results: AuditResult[]): void;

  /**
   * Filters audit results by state from repository
   * @param state Alert state to filter by
   * @returns Filtered audit results
   */
  filterAuditResults(state: AlertState): AlertAudit[];

  /**
   * Updates audit state for a single ticker
   * Does NOT clear existing data (unlike resetAuditResults)
   * @param investingTicker The ticker to audit
   * @param state The audit state
   * @returns The updated audit
   */
  updateTickerAudit(investingTicker: string, state: AlertState): AlertAudit;
}

/**
 * Audit Manager - Handles all repository interactions for audit operations
 * Does NOT handle plugin execution (plugins are run by handlers/managers)
 *
 * Responsibilities:
 * - Save audit results to repository
 * - Filter and retrieve audit results
 * - Persist ticker-specific audit states
 *
 * NOT responsible for:
 * - Running audit plugins
 * - Getting plugins from registry
 * - Formatting audit output
 */
export class AuditManager implements IAuditManager {
  constructor(private readonly auditRepo: IAuditRepo) {}

  /********** Public Methods **********/

  /**
   * Resets audit data: clears all previous results and saves new batch
   * Used when auditing all tickers at once
   */
  resetAuditResults(results: AuditResult[]): void {
    this.auditRepo.clear();
    results.forEach((r) => {
      const state = r.code as AlertState;
      this.auditRepo.set(r.target, new AlertAudit(r.target, state));
    });
  }

  /**
   * Filters audit results by state from repository
   */
  filterAuditResults(state: AlertState): AlertAudit[] {
    return this.auditRepo.getFilteredAuditResults(state);
  }

  /**
   * Updates audit state for a single ticker
   * Does NOT clear existing data (unlike resetAuditResults)
   */
  updateTickerAudit(investingTicker: string, state: AlertState): AlertAudit {
    const audit = new AlertAudit(investingTicker, state);
    this.auditRepo.set(investingTicker, audit);
    return audit;
  }
}
