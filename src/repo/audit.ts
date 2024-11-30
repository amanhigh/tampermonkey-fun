import { IRepoCron } from './cron';
import { MapRepo, IMapRepo } from './map';
import { AlertAudit, AlertState } from '../models/alert';
import { SerializedData } from './base';

/**
 * Interface for audit repository operations
 */
export interface IAuditRepo extends IMapRepo<string, AlertAudit> {
  /**
   * Get filtered audit results by state
   * @param state Alert state to filter by
   * @returns Filtered audit results
   */
  getFilteredAuditResults(state: AlertState): AlertAudit[];
}

/**
 * Repository for managing alert audit results
 */
export class AuditRepo extends MapRepo<string, AlertAudit> implements IAuditRepo {
  /**
   * Creates a new audit repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'auditRepo');
  }

  /**
   * @inheritdoc
   */
  protected _deserialize(data: SerializedData): Map<string, AlertAudit> {
    const auditMap = new Map<string, AlertAudit>();
    Object.entries(data).forEach(([ticker, audit]) => {
      const auditData = audit as { ticker: string; state: AlertState };
      auditMap.set(ticker, new AlertAudit(auditData.ticker, auditData.state));
    });
    return auditMap;
  }

  /**
   * @inheritdoc
   */
  public getFilteredAuditResults(state: AlertState): AlertAudit[] {
    return Array.from(this._map.values()).filter((result) => result.state === state);
  }
}
