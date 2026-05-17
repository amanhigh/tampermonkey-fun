import { TickerAlertClient, ITickerAlertClient } from '../../src/client/ticker_alert';
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

describe('TickerAlertClient', () => {
  let tickerAlertClient: ITickerAlertClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    tickerAlertClient = new TickerAlertClient();
    mockMakeRequest = (tickerAlertClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new TickerAlertClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new TickerAlertClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('createAlertTicker', () => {
    it('should POST to encoded ticker/alert-tickers and unwrap', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: null, ticker: 'MCX', created_at: '2026-05-05T10:31:00Z', updated_at: '2026-05-05T10:31:00Z' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerAlertClient.createAlertTicker('MCX', {
        symbol: 'MCIX',
        pair_id: '941982',
        name: 'Multi Commodity Exchange of India',
        exchange: null,
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX/alert-tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: null }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('getAlertTicker', () => {
    it('should GET encoded symbol path and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: null, ticker: 'MCX', created_at: '', updated_at: '' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerAlertClient.getAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX');
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('deleteAlertTicker', () => {
    it('should DELETE encoded symbol path', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await tickerAlertClient.deleteAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX', {
        method: 'DELETE',
      });
    });
  });

  // ── listAlertTickers (auto-paginating) ──

  describe('listAlertTickers', () => {
    it('should return all alert tickers from single page when total <= 100', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: {
          alert_tickers: [
            { symbol: 'MCIX', pair_id: '941982', name: 'MCX', exchange: null, ticker: 'MCX' },
          ],
          metadata: { total: 1, offset: 0, limit: 100 },
        },
      });

      const result = await tickerAlertClient.listAlertTickers({ symbol: 'MCIX' });

      expect(result).toHaveLength(1);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers?symbol=MCIX&offset=0&limit=100');
    });

    it('should paginate alert tickers across multiple pages', async () => {
      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            alert_tickers: Array.from({ length: 100 }, (_, i) => ({
              symbol: `S${i}`, pair_id: `${i}`, name: `Name${i}`, exchange: null,
            })),
            metadata: { total: 150, offset: 0, limit: 100 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            alert_tickers: Array.from({ length: 50 }, (_, i) => ({
              symbol: `S${100 + i}`, pair_id: `${100 + i}`, name: `Name${100 + i}`, exchange: null,
            })),
            metadata: { total: 150, offset: 100, limit: 100 },
          },
        });

      const result = await tickerAlertClient.listAlertTickers({});

      expect(result).toHaveLength(150);
      expect(mockMakeRequest).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when total is 0', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { alert_tickers: [], metadata: { total: 0, offset: 0, limit: 100 } },
      });

      const result = await tickerAlertClient.listAlertTickers({});

      expect(result).toEqual([]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
    });
  });

  // ── Error Handling ──

  describe('error handling', () => {
    it('should wrap Alert ticker creation errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('409 Conflict: Alert ticker already exists'));

      await expect(
        tickerAlertClient.createAlertTicker('MCX', { symbol: 'MCIX', pair_id: '941982', name: 'Test' })
      ).rejects.toThrow('Failed to create Alert ticker: 409 Conflict: Alert ticker already exists');
    });

    it('should wrap get Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerAlertClient.getAlertTicker('UNKNOWN')).rejects.toThrow('Failed to get Alert ticker: 404 Not Found');
    });

    it('should wrap delete Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerAlertClient.deleteAlertTicker('UNKNOWN')).rejects.toThrow('Failed to delete Alert ticker: 404 Not Found');
    });

    it('should wrap listAlertTickers errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(tickerAlertClient.listAlertTickers({})).rejects.toThrow('Failed to list all Alert tickers: 500 Internal Server Error');
    });
  });
});
