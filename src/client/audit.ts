import { BaseClient, IBaseClient } from './base';
import { KohanEnvelope } from '../models/api';
import { Constants } from '../models/constant';
import { AuditCatalog, AuditExecutionResult } from '../models/audit_catalogue';

/**
 * AuditClient handles audit catalogue listing and execution against the Kohan backend.
 * Covers PRD Section 2.2 Audit APIs.
 */
export interface IAuditClient extends IBaseClient {
  /**
   * Get the catalogue of active audit checks available to the operator.
   * @returns Promise resolving to the audit catalogue with ordered audit items
   */
  getAuditCatalogue(): Promise<AuditCatalog>;

  /**
   * Execute one audit check and return its paginated result.
   * Pagination is caller-controlled; each call re-runs the audit.
   * @param auditId - Stable audit ID in kebab-case (e.g. "alert-coverage")
   * @param offset - Optional finding page offset
   * @param limit - Optional finding page size
   * @returns Promise resolving to the full audit result with findings page
   */
  executeAudit(auditId: string, offset?: number, limit?: number): Promise<AuditExecutionResult>;
}

/**
 * AuditClient handles audit catalogue and execution APIs against the Kohan backend.
 */
export class AuditClient extends BaseClient implements IAuditClient {
  /**
   * Creates an instance of AuditClient.
   * @param baseUrl - Base URL for Kohan API (defaults to Constants.KOHAN.BASE_URL)
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
  async getAuditCatalogue(): Promise<AuditCatalog> {
    try {
      const response = await this.makeRequest<KohanEnvelope<AuditCatalog>>('/audits');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list audits: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async executeAudit(auditId: string, offset?: number, limit?: number): Promise<AuditExecutionResult> {
    try {
      const query = this.buildAuditQuery(offset, limit);
      const queryString = query ? `?${query.toString()}` : '';
      const response = await this.makeRequest<KohanEnvelope<AuditExecutionResult>>(
        `/audits/${encodeURIComponent(auditId)}/results${queryString}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to execute audit ${auditId}: ${(error as Error).message}`);
    }
  }

  /**
   * Build URLSearchParams for audit result query. Returns empty string if no params.
   */
  private buildAuditQuery(offset?: number, limit?: number): string {
    const params = new URLSearchParams();
    if (offset !== undefined) {
      params.set('offset', String(offset));
    }
    if (limit !== undefined) {
      params.set('limit', String(limit));
    }
    return params.toString();
  }
}
