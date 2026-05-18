import { Constants } from '../../src/models/constant';
import { IPriceAlertClient, PriceAlertClient } from '../../src/client/price_alert';

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

describe('PriceAlertClient', () => {
  let priceAlertClient: IPriceAlertClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    priceAlertClient = new PriceAlertClient();
    mockMakeRequest = (priceAlertClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new PriceAlertClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new PriceAlertClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('replacePriceAlerts', () => {
    it('should PUT to alerts endpoint and unwrap replacement result', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { pairs_replaced: 1, alerts_created: 2 },
      };
      const request = {
        alerts: [
          { pair_id: '1', alert_id: '158741518', trigger_price: 1.0632 },
          { pair_id: '1', alert_id: '158741514', trigger_price: 1.2401 },
        ],
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await priceAlertClient.replacePriceAlerts(request);

      expect(mockMakeRequest).toHaveBeenCalledWith('/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(request),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('createPendingPriceAlert', () => {
    it('should POST to encoded ticker alerts endpoint and unwrap price alert', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { pair_id: '1', trigger_price: 1.0632, created_at: '2026-05-05T10:32:00Z' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await priceAlertClient.createPendingPriceAlert('EUR/USD', { trigger_price: 1.0632 });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/EUR%2FUSD/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ trigger_price: 1.0632 }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('deletePriceAlert', () => {
    it('should DELETE encoded alert id path', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await priceAlertClient.deletePriceAlert('158741518');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alerts/158741518', {
        method: 'DELETE',
      });
    });
  });

  describe('listPriceAlerts', () => {
    it('should return all price alerts from single page when total <= 10', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: {
          alerts: [{ alert_id: '158741518', trigger_price: 1.0632, pair_id: '1', created_at: '2026-05-05T10:32:00Z' }],
          metadata: { total: 1, offset: 0, limit: 10 },
        },
      });

      const result = await priceAlertClient.listPriceAlerts({ ticker: 'EURUSD', 'sort-by': 'trigger_price', 'sort-order': 'asc' });

      expect(result).toHaveLength(1);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest).toHaveBeenCalledWith('/alerts?ticker=EURUSD&sort-by=trigger_price&sort-order=asc&offset=0&limit=10');
    });

    it('should paginate price alerts across multiple pages', async () => {
      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            alerts: Array.from({ length: 10 }, (_, i) => ({
              alert_id: `${i}`,
              trigger_price: i + 1,
              pair_id: '1',
              created_at: '2026-05-05T10:32:00Z',
            })),
            metadata: { total: 15, offset: 0, limit: 10 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            alerts: Array.from({ length: 5 }, (_, i) => ({
              alert_id: `${10 + i}`,
              trigger_price: 10 + i + 1,
              pair_id: '1',
              created_at: '2026-05-05T10:32:00Z',
            })),
            metadata: { total: 15, offset: 10, limit: 10 },
          },
        });

      const result = await priceAlertClient.listPriceAlerts({});

      expect(result).toHaveLength(15);
      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      expect(mockMakeRequest).toHaveBeenNthCalledWith(1, '/alerts?offset=0&limit=10');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(2, '/alerts?offset=10&limit=10');
    });
  });

  describe('error handling', () => {
    it('should wrap replace price alerts errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(priceAlertClient.replacePriceAlerts({ alerts: [] })).rejects.toThrow('Failed to replace price alerts: 404 Not Found');
    });

    it('should wrap create pending price alert errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(priceAlertClient.createPendingPriceAlert('EURUSD', { trigger_price: 1.0632 })).rejects.toThrow(
        'Failed to create pending price alert: 500 Internal Server Error'
      );
    });

    it('should wrap delete price alert errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(priceAlertClient.deletePriceAlert('UNKNOWN')).rejects.toThrow('Failed to delete price alert: 404 Not Found');
    });

    it('should wrap list price alerts errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('400 Bad Request'));

      await expect(priceAlertClient.listPriceAlerts({})).rejects.toThrow('Failed to list all price alerts: 400 Bad Request');
    });
  });
});
