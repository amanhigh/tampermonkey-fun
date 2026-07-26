import { AlertsPlugin } from '../../src/manager/alerts_plugin';
import { IAuditClient } from '../../src/client/audit';
import { AuditExecutionResult } from '../../src/models/audit_catalogue';

describe('AlertsPlugin (backend adapter)', () => {
  let plugin: AlertsPlugin;
  let mockAuditClient: jest.Mocked<IAuditClient>;

  const makeExecutionResult = (
    overrides: Partial<AuditExecutionResult> = {}
  ): AuditExecutionResult => ({
    audit_id: 'alert-coverage',
    generated_at: '2026-06-07T10:00:00Z',
    counts: {},
    findings: [],
    metadata: { total: 0, offset: 0, limit: 10 },
    ...overrides,
  });

  beforeEach(() => {
    mockAuditClient = {
      getBaseUrl: jest.fn(),
      getAuditCatalogue: jest.fn(),
      executeAudit: jest.fn(),
    } as jest.Mocked<IAuditClient>;

    plugin = new AlertsPlugin(mockAuditClient, 10);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('properties', () => {
    it('exposes backend audit id alert-coverage', () => {
      expect(plugin.id).toBe('alert-coverage');
    });

    it('exposes correct title', () => {
      expect(plugin.title).toBe('Alert Coverage');
    });
  });

  describe('run', () => {
    it('calls AuditClient.executeAudit with backend audit id and section limit', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(makeExecutionResult({ findings: [] }));

      await plugin.run();

      expect(mockAuditClient.executeAudit).toHaveBeenCalledWith('alert-coverage', 0, 10);
    });

    it('maps NO_ALERT_TICKER backend finding to AuditResult', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          metadata: { total: 1, offset: 0, limit: 10 },
          findings: [
            { code: 'NO_ALERT_TICKER', target: 'MCX', severity: 'HIGH', data: { alert_ticker_count: '0', price_alert_count: '0' } },
          ],
        })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        code: 'NO_ALERT_TICKER',
        target: 'MCX',
        severity: 'HIGH',
        data: { alert_ticker_count: '0', price_alert_count: '0' },
      });
    });

    it('maps NO_ALERTS and SINGLE_ALERT findings to AuditResult', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          metadata: { total: 2, offset: 0, limit: 10 },
          findings: [
            { code: 'NO_ALERTS', target: 'INFY', severity: 'MEDIUM', data: { alert_ticker_count: '1', price_alert_count: '0' } },
            { code: 'SINGLE_ALERT', target: 'TCS', severity: 'HIGH', data: { alert_ticker_count: '1', price_alert_count: '1' } },
          ],
        })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      expect(results[0].code).toBe('NO_ALERTS');
      expect(results[0].target).toBe('INFY');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[1].code).toBe('SINGLE_ALERT');
      expect(results[1].target).toBe('TCS');
      expect(results[1].severity).toBe('HIGH');
    });

    it('preserves finding data metadata', async () => {
      mockAuditClient.executeAudit.mockResolvedValue(
        makeExecutionResult({
          metadata: { total: 1, offset: 0, limit: 10 },
          findings: [
            { code: 'NO_ALERT_TICKER', target: 'MCX', severity: 'HIGH', data: { alert_ticker_count: '0', price_alert_count: '0' } },
          ],
        })
      );

      const [result] = await plugin.run();

      expect(result.data).toEqual({ alert_ticker_count: '0', price_alert_count: '0' });
    });

    it('aggregates findings across multiple pages', async () => {
      mockAuditClient.executeAudit
        .mockResolvedValueOnce(
          makeExecutionResult({
            metadata: { total: 3, offset: 0, limit: 10 },
            findings: [
              { code: 'NO_ALERT_TICKER', target: 'MCX', severity: 'HIGH', data: { alert_ticker_count: '0', price_alert_count: '0' } },
            ],
          })
        )
        .mockResolvedValueOnce(
          makeExecutionResult({
            metadata: { total: 3, offset: 10, limit: 10 },
            findings: [
              { code: 'NO_ALERTS', target: 'INFY', severity: 'MEDIUM', data: { alert_ticker_count: '1', price_alert_count: '0' } },
              { code: 'SINGLE_ALERT', target: 'TCS', severity: 'HIGH', data: { alert_ticker_count: '1', price_alert_count: '1' } },
            ],
          })
        );

      const results = await plugin.run();

      expect(results).toHaveLength(3);
      expect(results[0].code).toBe('NO_ALERT_TICKER');
      expect(results[1].code).toBe('NO_ALERTS');
      expect(results[2].code).toBe('SINGLE_ALERT');
      expect(mockAuditClient.executeAudit).toHaveBeenCalledTimes(2);
      expect(mockAuditClient.executeAudit).toHaveBeenNthCalledWith(1, 'alert-coverage', 0, 10);
      expect(mockAuditClient.executeAudit).toHaveBeenNthCalledWith(2, 'alert-coverage', 10, 10);
    });

    it('surfaces backend client execution errors', async () => {
      mockAuditClient.executeAudit.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(plugin.run()).rejects.toThrow('500 Internal Server Error');
    });
  });
});
