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

    it('should split more than 100 alerts into multiple pair-safe PUT requests', async () => {
      // Build 150 alerts across 2 pairs (pair_1: 100, pair_2: 50)
      const pair1Alerts = Array.from({ length: 100 }, (_, i) => ({
        pair_id: 'pair_1',
        alert_id: `pair1_${i}`,
        trigger_price: i + 1,
      }));
      const pair2Alerts = Array.from({ length: 50 }, (_, i) => ({
        pair_id: 'pair_2',
        alert_id: `pair2_${i}`,
        trigger_price: i + 1,
      }));
      const allAlerts = [...pair1Alerts, ...pair2Alerts];
      const request = { alerts: allAlerts };

      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: { pairs_replaced: 1, alerts_created: 100 },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: { pairs_replaced: 1, alerts_created: 50 },
        });

      const result = await priceAlertClient.replacePriceAlerts(request);

      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      // First batch: pair_1 alerts (100)
      expect(mockMakeRequest).toHaveBeenNthCalledWith(1, '/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ alerts: pair1Alerts }),
      });
      // Second batch: pair_2 alerts (50)
      expect(mockMakeRequest).toHaveBeenNthCalledWith(2, '/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ alerts: pair2Alerts }),
      });
      expect(result).toEqual({ pairs_replaced: 2, alerts_created: 150 });
    });

    it('should aggregate pairs_replaced and alerts_created across batches', async () => {
      // 180 alerts across 3 pairs of 60 each → 3 batches (60+60 > 100, 60+60 > 100)
      const makeAlerts = (pairId: string, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          pair_id: pairId,
          alert_id: `${pairId}_${i}`,
          trigger_price: i + 1,
        }));

      const allAlerts = [...makeAlerts('a', 60), ...makeAlerts('b', 60), ...makeAlerts('c', 60)];

      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: { pairs_replaced: 1, alerts_created: 60 },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: { pairs_replaced: 1, alerts_created: 60 },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: { pairs_replaced: 1, alerts_created: 60 },
        });

      const result = await priceAlertClient.replacePriceAlerts({ alerts: allAlerts });

      expect(mockMakeRequest).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ pairs_replaced: 3, alerts_created: 180 });
    });

    it('should send one empty replace request when alerts are empty', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { pairs_replaced: 0, alerts_created: 0 },
      });

      const result = await priceAlertClient.replacePriceAlerts({ alerts: [] });

      expect(mockMakeRequest).toHaveBeenCalledWith('/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ alerts: [] }),
      });
      expect(result).toEqual({ pairs_replaced: 0, alerts_created: 0 });
    });

    it('should throw before backend call when one pair_id has more than 100 alerts', async () => {
      const oversizedAlerts = Array.from({ length: 150 }, (_, i) => ({
        pair_id: 'oversized',
        alert_id: `${i}`,
        trigger_price: i,
      }));

      await expect(priceAlertClient.replacePriceAlerts({ alerts: oversizedAlerts })).rejects.toThrow(
        'Failed to replace price alerts: Pair oversized has 150 alerts, which exceeds the maximum batch size of 100'
      );

      expect(mockMakeRequest).not.toHaveBeenCalled();
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
