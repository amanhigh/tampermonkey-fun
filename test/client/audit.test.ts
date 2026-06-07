import { Constants } from '../../src/models/constant';
import { IAuditClient, AuditClient } from '../../src/client/audit';

// Mock the BaseClient's makeRequest method
jest.mock('../../src/client/base', () => {
  const originalModule = jest.requireActual('../../src/client/base');
  return {
    ...originalModule,
    BaseClient: class MockBaseClient {
      private baseUrl: string;

      constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
      }

      getBaseUrl(): string {
        return this.baseUrl;
      }

      protected makeRequest = jest.fn();
    },
  };
});

describe('AuditClient', () => {
  let auditClient: IAuditClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    auditClient = new AuditClient();
    mockMakeRequest = (auditClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new AuditClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new AuditClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('getAuditCatalogue', () => {
    it('should GET /audits and return the catalogue with audit items', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audits: [
            { id: 'alert-coverage', title: 'Alert Coverage', description: 'Tracked instruments with missing or insufficient price-alert coverage.', order: 1 },
            { id: 'gtt-unwatched', title: 'GTT Unwatched', description: 'External GTT orders that no longer match the tracked instrument universe.', order: 2 },
          ],
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await auditClient.getAuditCatalogue();

      expect(mockMakeRequest).toHaveBeenCalledWith('/audits');
      expect(result.audits).toHaveLength(2);
      expect(result.audits[0].id).toBe('alert-coverage');
      expect(result.audits[0].title).toBe('Alert Coverage');
      expect(result.audits[0].order).toBe(1);
      expect(result.audits[1].id).toBe('gtt-unwatched');
    });

    it('should preserve backend hyphen-case audit IDs', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audits: [
            { id: 'alert-coverage', title: 'Alert Coverage', description: '', order: 1 },
            { id: 'trade-risk', title: 'Trade Risk', description: '', order: 4 },
          ],
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await auditClient.getAuditCatalogue();

      expect(result.audits.map((a: any) => a.id)).toEqual(['alert-coverage', 'trade-risk']);
    });

    it('should wrap catalogue errors with descriptive message', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(auditClient.getAuditCatalogue()).rejects.toThrow('Failed to list audits: 500 Internal Server Error');
    });
  });

  describe('executeAudit', () => {
    it('should GET encoded /audits/{audit-id}/results without query when no pagination params', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audit_id: 'alert-coverage',
          generated_at: '2026-06-06T10:15:00Z',
          counts: { NO_ALERT_TICKER: 1, NO_ALERTS: 2 },
          findings: [
            { code: 'NO_ALERT_TICKER', target: 'MCX', severity: 'HIGH', data: { alert_ticker_count: '0', price_alert_count: '0' } },
          ],
          metadata: { total: 3, offset: 0, limit: 20 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await auditClient.executeAudit('alert-coverage');

      expect(mockMakeRequest).toHaveBeenCalledWith('/audits/alert-coverage/results');
      expect(result.audit_id).toBe('alert-coverage');
      expect(result.counts).toEqual({ NO_ALERT_TICKER: 1, NO_ALERTS: 2 });
      expect(result.findings).toHaveLength(1);
      expect(result.metadata.total).toBe(3);
    });

    it('should append offset and limit query params when both provided', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audit_id: 'alert-coverage',
          generated_at: '2026-06-06T10:15:00Z',
          counts: { NO_ALERT_TICKER: 1, NO_ALERTS: 2 },
          findings: [],
          metadata: { total: 3, offset: 1, limit: 1 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      await auditClient.executeAudit('alert-coverage', 1, 1);

      expect(mockMakeRequest).toHaveBeenCalledWith('/audits/alert-coverage/results?offset=1&limit=1');
    });

    it('should append only limit query param when offset is absent', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audit_id: 'alert-coverage',
          generated_at: '2026-06-06T10:15:00Z',
          counts: {},
          findings: [],
          metadata: { total: 0, offset: 0, limit: 5 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      await auditClient.executeAudit('alert-coverage', undefined, 5);

      expect(mockMakeRequest).toHaveBeenCalledWith('/audits/alert-coverage/results?limit=5');
    });

    it('should encode audit ID path segments', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { audit_id: 'alert-coverage', generated_at: '', counts: {}, findings: [], metadata: { total: 0, offset: 0, limit: 20 } },
      } as any);

      await auditClient.executeAudit('alert coverage');

      expect(mockMakeRequest).toHaveBeenCalledWith('/audits/alert%20coverage/results');
    });

    it('should unwrap AuditExecutionResult including counts, findings, and metadata', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          audit_id: 'stale-review',
          generated_at: '2026-06-07T08:00:00Z',
          counts: { STALE: 5 },
          findings: [
            { code: 'STALE', target: 'XYZ', severity: 'MEDIUM', data: { days_since_review: '200' } },
          ],
          metadata: { total: 5, offset: 0, limit: 20 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await auditClient.executeAudit('stale-review');

      expect(result).toEqual({
        audit_id: 'stale-review',
        generated_at: '2026-06-07T08:00:00Z',
        counts: { STALE: 5 },
        findings: [
          { code: 'STALE', target: 'XYZ', severity: 'MEDIUM', data: { days_since_review: '200' } },
        ],
        metadata: { total: 5, offset: 0, limit: 20 },
      });
    });

    it('should wrap execution errors with audit ID context', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(auditClient.executeAudit('unknown-audit')).rejects.toThrow(
        'Failed to execute audit unknown-audit: 404 Not Found'
      );
    });
  });
});
