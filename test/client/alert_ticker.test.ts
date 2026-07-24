import { AlertTickerClient, IAlertTickerClient } from '../../src/client/alert_ticker';
import { Constants } from '../../src/models/constant';

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

describe('AlertTickerClient', () => {
  let alertTickerClient: IAlertTickerClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    alertTickerClient = new AlertTickerClient();
    mockMakeRequest = (alertTickerClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new AlertTickerClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new AlertTickerClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('createAlertTicker', () => {
    it('should POST to encoded ticker/alert-tickers and unwrap', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: 'NSE', type: 'SECONDARY', ticker: 'MCX', created_at: '2026-05-05T10:31:00Z', updated_at: '2026-05-05T10:31:00Z' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await alertTickerClient.createAlertTicker('MCX', {
        symbol: 'MCIX',
        pair_id: '941982',
        name: 'Multi Commodity Exchange of India',
        type: 'SECONDARY',
        exchange: 'NSE',
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX/alert-tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', type: 'SECONDARY', exchange: 'NSE' }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('getAlertTicker', () => {
    it('should GET encoded symbol path and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: 'NASDAQ', type: 'PRIMARY', ticker: 'MCX', created_at: '', updated_at: '' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await alertTickerClient.getAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX');
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('deleteAlertTicker', () => {
    it('should DELETE encoded symbol path', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await alertTickerClient.deleteAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX', {
        method: 'DELETE',
      });
    });
  });

  // ── listAlertTickers (single-page) ──

  describe('listAlertTickers', () => {
    it('should return AlertTickerListResponse with alert_tickers and metadata', async () => {
      const pageResponse = {
        alert_tickers: [
          { symbol: 'MCIX', pair_id: '941982', name: 'MCX', exchange: 'NSE', type: 'SECONDARY', ticker: 'MCX' },
        ],
        metadata: { total: 1, offset: 0, limit: 100 },
      };
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: pageResponse,
      });

      const result = await alertTickerClient.listAlertTickers({ symbol: 'MCIX' });

      expect(result).toEqual(pageResponse);
      expect(result.alert_tickers).toHaveLength(1);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers?symbol=MCIX');
    });

    it('should forward explicit offset and limit from params', async () => {
      const pageResponse = {
        alert_tickers: [
          { symbol: 'S50', pair_id: '50', name: 'Name50', exchange: 'NSE', type: 'SECONDARY', ticker: 'MCX' },
        ],
        metadata: { total: 150, offset: 50, limit: 10 },
      };
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: pageResponse,
      });

      const result = await alertTickerClient.listAlertTickers({ offset: 50, limit: 10 });

      expect(result).toEqual(pageResponse);
      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers?offset=50&limit=10');
    });

    it('should forward all filter parameters in a single request', async () => {
      const pageResponse = {
        alert_tickers: [
          { symbol: 'MCIX', pair_id: '941982', name: 'MCX', exchange: 'NSE', type: 'PRIMARY', ticker: 'MCX' },
        ],
        metadata: { total: 1, offset: 0, limit: 100 },
      };
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: pageResponse,
      });

      await alertTickerClient.listAlertTickers({
        symbol: 'MCIX',
        ticker: 'MCX',
        'pair-id': '941982',
        exchange: 'NSE',
        type: 'PRIMARY',
      });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        '/alert-tickers?symbol=MCIX&ticker=MCX&pair-id=941982&exchange=NSE&type=PRIMARY'
      );
    });

    it('should return empty alert_tickers when total is 0', async () => {
      const pageResponse = {
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 100 },
      };
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: pageResponse,
      });

      const result = await alertTickerClient.listAlertTickers({});

      expect(result).toEqual(pageResponse);
      expect(result.alert_tickers).toEqual([]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
    });

    it('should not auto-paginate across multiple pages', async () => {
      const pageResponse = {
        alert_tickers: Array.from({ length: 100 }, (_, i) => ({
          symbol: `S${i}`, pair_id: `${i}`, name: `Name${i}`, exchange: 'NSE', type: 'SECONDARY',
        })),
        metadata: { total: 150, offset: 0, limit: 100 },
      };
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: pageResponse,
      });

      const result = await alertTickerClient.listAlertTickers({});

      expect(result.alert_tickers).toHaveLength(100);
      expect(result.metadata.total).toBe(150);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
    });
  });

  // ── Error Handling ──

  describe('error handling', () => {
    it('should wrap Alert ticker creation errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('409 Conflict: Alert ticker already exists'));

      await expect(
        alertTickerClient.createAlertTicker('MCX', { symbol: 'MCIX', pair_id: '941982', name: 'Test', exchange: 'NSE', type: 'SECONDARY' })
      ).rejects.toThrow('Failed to create Alert ticker: 409 Conflict: Alert ticker already exists');
    });

    it('should wrap get Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(alertTickerClient.getAlertTicker('UNKNOWN')).rejects.toThrow('Failed to get Alert ticker: 404 Not Found');
    });

    it('should wrap delete Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(alertTickerClient.deleteAlertTicker('UNKNOWN')).rejects.toThrow('Failed to delete Alert ticker: 404 Not Found');
    });

    it('should wrap listAlertTickers errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(alertTickerClient.listAlertTickers({})).rejects.toThrow('Failed to list Alert tickers: 500 Internal Server Error');
    });
  });
});
