import { StaleReviewPlugin } from '../../src/manager/stale_review_plugin';
import { IAuditClient } from '../../src/client/audit';
import { AuditExecutionResult } from '../../src/models/audit_catalogue';

describe('StaleReviewPlugin (backend adapter)', () => {
  let plugin: StaleReviewPlugin;
  let mockAuditClient: jest.Mocked<IAuditClient>;

  const makeExecutionResult = (
    overrides: Partial<AuditExecutionResult> = {}
  ): AuditExecutionResult => ({
    audit_id: 'stale-review',
    generated_at: '2026-06-07T10:00:00Z',
    counts: { STALE_TICKER: 1 },
    findings: [],
    metadata: { total: 1, offset: 0, limit: 10 },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditClient = {
      getBaseUrl: jest.fn(),
      getAuditCatalogue: jest.fn(),
      executeAudit: jest.fn(),
    } as jest.Mocked<IAuditClient>;

    plugin = new StaleReviewPlugin(mockAuditClient, 10);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('properties', () => {
    it('exposes backend audit id stale-review', () => {
      expect(plugin.id).toBe('stale-review');
    });

    it('exposes correct title', () => {
      expect(plugin.title).toBe('Stale Review');
    });
  });

  describe('run', () => {
    it('calls AuditClient.executeAudit with backend audit id and section limit', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(makeExecutionResult({ findings: [] }));

      await plugin.run();

      expect(mockAuditClient.executeAudit).toHaveBeenCalledWith('stale-review', 0, 10);
    });

    it('maps STALE_TICKER backend finding to AuditResult', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          findings: [
            { code: 'STALE_TICKER', target: 'MCX', severity: 'MEDIUM', data: { last_opened_at: '2025-11-19T00:00:00Z' } },
          ],
        })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        pluginId: 'stale-review',
        code: 'STALE_TICKER',
        target: 'MCX',
        message: 'MCX: not recently opened',
        severity: 'MEDIUM',
        status: 'FAIL',
      });
    });

    it('computes daysSinceOpen from last_opened_at timestamp', async () => {
      const mockNow = new Date('2026-06-07T00:00:00Z').getTime();
      const jestNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          findings: [
            { code: 'STALE_TICKER', target: 'TCS', severity: 'MEDIUM', data: { last_opened_at: '2025-11-19T00:00:00Z' } },
          ],
        })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].data).toMatchObject({
        last_opened_at: '2025-11-19T00:00:00Z',
        daysSinceOpen: 200,
      });

      jestNowSpy.mockRestore();
    });

    it('omits daysSinceOpen when last_opened_at is missing', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          findings: [
            { code: 'STALE_TICKER', target: 'TCS', severity: 'MEDIUM', data: {} },
          ],
        })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].data?.daysSinceOpen).toBeUndefined();
    });

    it('returns empty when backend returns no findings', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(makeExecutionResult({ findings: [] }));

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('rejects targeted runs because backend audit is batch-only', async () => {
      await expect(plugin.run(['TCS'])).rejects.toThrow(
        'Stale Review audit does not support targeted runs'
      );
    });

    it('surfaces backend client execution errors', async () => {
      mockAuditClient.executeAudit.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(plugin.run()).rejects.toThrow('500 Internal Server Error');
    });
  });
});
