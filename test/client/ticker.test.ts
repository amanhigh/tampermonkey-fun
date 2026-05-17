import { TickerClient, ITickerClient } from '../../src/client/ticker';
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

describe('TickerClient', () => {
  let tickerClient: ITickerClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    tickerClient = new TickerClient();
    mockMakeRequest = (tickerClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new TickerClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new TickerClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  // ── Primary Ticker APIs (2.2.1) ──

  describe('createTicker', () => {
    it('should POST to /tickers and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          ticker: 'MCX',
          exchange: 'NSE',
          timeframes: ['MN', 'WK', 'DL'],
          type: 'EQUITY',
          state: 'WATCHED',
          trend: 'UPTREND',
          last_opened_at: '2026-05-05T10:30:00Z',
          is_fno: true,
          created_at: '2026-05-05T10:30:01Z',
          updated_at: '2026-05-05T10:30:01Z',
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.createTicker({
        ticker: 'MCX',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        last_opened_at: '2026-05-05T10:30:00Z',
        is_fno: true,
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          ticker: 'MCX',
          exchange: 'NSE',
          timeframes: ['MN', 'WK', 'DL'],
          type: 'EQUITY',
          state: 'WATCHED',
          trend: 'UPTREND',
          last_opened_at: '2026-05-05T10:30:00Z',
          is_fno: true,
        }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });

    it('should wrap creation errors with descriptive message', async () => {
      mockMakeRequest.mockRejectedValue(new Error('409 Conflict: Ticker already exists'));

      await expect(
        tickerClient.createTicker({
          ticker: 'MCX',
          timeframes: ['MN'],
          type: 'EQUITY',
          state: 'WATCHED',
          trend: 'UPTREND',
          last_opened_at: '2026-05-05T10:30:00Z',
        })
      ).rejects.toThrow('Failed to create ticker: 409 Conflict: Ticker already exists');
    });
  });

  describe('getTicker', () => {
    it('should GET encoded ticker path and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { ticker: 'MCX', exchange: 'NSE', timeframes: ['MN'], type: 'EQUITY', state: 'WATCHED', trend: 'UPTREND', last_opened_at: '2026-05-05T10:30:00Z', is_fno: false, created_at: '', updated_at: '' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.getTicker('MCX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX');
      expect(result).toEqual(apiEnvelope.data);
    });

    it('should encode composite ticker path values', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success', data: null } as any);

      await tickerClient.getTicker('NIFTY/USDINR');

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/NIFTY%2FUSDINR');
    });
  });

  describe('updateTicker', () => {
    it('should PUT to encoded ticker path with mutable fields', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          ticker: 'MCX',
          exchange: 'NSE',
          timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
          type: 'EQUITY',
          state: 'READY',
          trend: 'UPTREND',
          is_fno: true,
          updated_at: '2026-05-05T11:00:01Z',
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.updateTicker('MCX', {
        exchange: 'NSE',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        type: 'EQUITY',
        state: 'READY',
        trend: 'UPTREND',
        is_fno: true,
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          exchange: 'NSE',
          timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
          type: 'EQUITY',
          state: 'READY',
          trend: 'UPTREND',
          is_fno: true,
        }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('patchTickerLastOpened', () => {
    it('should PATCH encoded ticker path with last_opened_at only', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { ticker: 'MCX', last_opened_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-05T11:00:01Z' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.patchTickerLastOpened('MCX', {
        last_opened_at: '2026-05-05T11:00:00Z',
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ last_opened_at: '2026-05-05T11:00:00Z' }),
      });
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('deleteTicker', () => {
    it('should DELETE encoded ticker path', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await tickerClient.deleteTicker('MCX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/MCX', {
        method: 'DELETE',
      });
    });

    it('should encode composite ticker paths', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await tickerClient.deleteTicker('NIFTY+USDINR');

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers/NIFTY%2BUSDINR', {
        method: 'DELETE',
      });
    });
  });

  describe('listTickers', () => {
    it('should serialize query params and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          tickers: [
            { ticker: 'MCX', exchange: 'NSE', timeframes: ['MN'], type: 'EQUITY', state: 'WATCHED', trend: 'UPTREND', last_opened_at: '', is_fno: true, created_at: '', updated_at: '', alert_ticker_count: 1 },
          ],
          metadata: { offset: 0, limit: 20, total: 1 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.listTickers({
        search: 'MCX',
        'is-fno': true,
        offset: 0,
        limit: 20,
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?search=MCX&is-fno=true&offset=0&limit=20');
      expect(result).toEqual(apiEnvelope.data);
    });

    it('should include sort params when provided', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success', data: { tickers: [], metadata: { offset: 0, limit: 20, total: 0 } } } as any);

      await tickerClient.listTickers({ 'sort-by': 'last_opened_at', 'sort-order': 'desc' });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?sort-by=last_opened_at&sort-order=desc');
    });

    it('should encode opened-after timestamp', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success', data: { tickers: [], metadata: { offset: 0, limit: 20, total: 0 } } } as any);

      await tickerClient.listTickers({ 'opened-after': '2026-01-01T00:00:00Z' });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?opened-after=2026-01-01T00%3A00%3A00Z');
    });

    it('should handle is-fno=false correctly', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success', data: { tickers: [], metadata: { offset: 0, limit: 20, total: 0 } } } as any);

      await tickerClient.listTickers({ 'is-fno': false });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?is-fno=false');
    });
  });

  // ── Alert Ticker APIs (2.2.2) ──

  describe('createAlertTicker', () => {
    it('should POST to encoded ticker/alert-tickers and unwrap', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: null, ticker: 'MCX', created_at: '2026-05-05T10:31:00Z', updated_at: '2026-05-05T10:31:00Z' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.createAlertTicker('MCX', {
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

      const result = await tickerClient.getAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX');
      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('deleteAlertTicker', () => {
    it('should DELETE encoded symbol path', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await tickerClient.deleteAlertTicker('MCIX');

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers/MCIX', {
        method: 'DELETE',
      });
    });
  });

  describe('listAlertTickers', () => {
    it('should serialize query params and unwrap envelope.data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          alert_tickers: [
            { symbol: 'MCIX', pair_id: '941982', name: 'Multi Commodity Exchange of India', exchange: null, ticker: 'MCX' },
          ],
          metadata: { offset: 0, limit: 20, total: 1 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await tickerClient.listAlertTickers({
        symbol: 'MCIX',
        ticker: 'MCX',
        offset: 0,
        limit: 20,
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers?symbol=MCIX&ticker=MCX&offset=0&limit=20');
      expect(result).toEqual(apiEnvelope.data);
    });

    it('should include pair-id and exchange filters', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success', data: { alert_tickers: [], metadata: { offset: 0, limit: 20, total: 0 } } } as any);

      await tickerClient.listAlertTickers({ 'pair-id': '941982', exchange: 'NSE' });

      expect(mockMakeRequest).toHaveBeenCalledWith('/alert-tickers?pair-id=941982&exchange=NSE');
    });
  });

  // ── Error Handling ──

  describe('error handling', () => {
    it('should wrap create ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(
        tickerClient.createTicker({
          ticker: 'MCX',
          timeframes: ['MN'],
          type: 'EQUITY',
          state: 'WATCHED',
          trend: 'UPTREND',
          last_opened_at: '2026-05-05T10:30:00Z',
        })
      ).rejects.toThrow('Failed to create ticker: 503 Service Unavailable');
    });

    it('should wrap Alert ticker creation errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('409 Conflict: Alert ticker already exists'));

      await expect(
        tickerClient.createAlertTicker('MCX', { symbol: 'MCIX', pair_id: '941982', name: 'Test' })
      ).rejects.toThrow('Failed to create Alert ticker: 409 Conflict: Alert ticker already exists');
    });

    it('should wrap get ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerClient.getTicker('UNKNOWN')).rejects.toThrow('Failed to get ticker: 404 Not Found');
    });

    it('should wrap update ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(
        tickerClient.updateTicker('UNKNOWN', { timeframes: ['MN'], type: 'EQUITY', state: 'WATCHED', trend: 'UPTREND', is_fno: false })
      ).rejects.toThrow('Failed to update ticker: 404 Not Found');
    });

    it('should wrap delete ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerClient.deleteTicker('UNKNOWN')).rejects.toThrow('Failed to delete ticker: 404 Not Found');
    });

    it('should wrap list tickers errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(tickerClient.listTickers({})).rejects.toThrow('Failed to list tickers: 500 Internal Server Error');
    });

    it('should wrap get Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerClient.getAlertTicker('UNKNOWN')).rejects.toThrow('Failed to get Alert ticker: 404 Not Found');
    });

    it('should wrap delete Alert ticker errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(tickerClient.deleteAlertTicker('UNKNOWN')).rejects.toThrow('Failed to delete Alert ticker: 404 Not Found');
    });

    it('should wrap list Alert tickers errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(tickerClient.listAlertTickers({})).rejects.toThrow('Failed to list Alert tickers: 500 Internal Server Error');
    });
  });
});
