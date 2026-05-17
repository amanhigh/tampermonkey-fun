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

  // ── listAllTickers (auto-paginating) ──

  describe('listAllTickers', () => {
    it('should return all records from a single page when total <= 100', async () => {
      const page = Array.from({ length: 3 }, (_, i) => ({
        ticker: `T${i}`, exchange: null, timeframes: ['MN'] as any, type: 'EQUITY' as any,
        state: 'WATCHED' as any, trend: 'UPTREND' as any, last_opened_at: '', is_fno: false,
        created_at: '', updated_at: '',
      }));
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { tickers: page, metadata: { total: 3, offset: 0, limit: 100 } },
      });

      const result = await tickerClient.listAllTickers({ 'is-fno': false });

      expect(result).toHaveLength(3);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?is-fno=false&offset=0&limit=100');
    });

    it('should paginate through multiple pages for total > 100', async () => {
      const makePage = (start: number) => ({
        status: 'success',
        data: {
          tickers: Array.from({ length: 100 }, (_, i) => ({
            ticker: `T${start + i}`, exchange: null, timeframes: ['MN'] as any,
            type: 'EQUITY' as any, state: 'WATCHED' as any, trend: 'UPTREND' as any,
            last_opened_at: '', is_fno: false, created_at: '', updated_at: '',
          })),
          metadata: { total: 250, offset: start, limit: 100 },
        },
      });

      mockMakeRequest
        .mockResolvedValueOnce(makePage(0))
        .mockResolvedValueOnce(makePage(100))
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            tickers: Array.from({ length: 50 }, (_, i) => ({
              ticker: `T${200 + i}`, exchange: null, timeframes: ['MN'] as any,
              type: 'EQUITY' as any, state: 'WATCHED' as any, trend: 'UPTREND' as any,
              last_opened_at: '', is_fno: false, created_at: '', updated_at: '',
            })),
            metadata: { total: 250, offset: 200, limit: 100 },
          },
        });

      const result = await tickerClient.listAllTickers({});

      expect(result).toHaveLength(250);
      expect(mockMakeRequest).toHaveBeenCalledTimes(3);
      expect(mockMakeRequest).toHaveBeenNthCalledWith(1, '/tickers?offset=0&limit=100');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(2, '/tickers?offset=100&limit=100');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(3, '/tickers?offset=200&limit=100');
    });

    it('should return empty array when total is 0', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { tickers: [], metadata: { total: 0, offset: 0, limit: 100 } },
      });

      const result = await tickerClient.listAllTickers({});

      expect(result).toEqual([]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
    });

    it('should preserve filters on every page', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { tickers: [], metadata: { total: 0, offset: 0, limit: 100 } },
      });

      await tickerClient.listAllTickers({ 'is-fno': true, exchange: 'NSE' });

      expect(mockMakeRequest).toHaveBeenCalledWith('/tickers?exchange=NSE&is-fno=true&offset=0&limit=100');
    });

    it('should throw contextual error on page failure', async () => {
      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: { tickers: [{ ticker: 'A', exchange: null, timeframes: ['MN'] as any, type: 'EQUITY' as any, state: 'WATCHED' as any, trend: 'UPTREND' as any, last_opened_at: '', is_fno: false, created_at: '', updated_at: '' }], metadata: { total: 150, offset: 0, limit: 100 } },
        })
        .mockRejectedValue(new Error('500 Server Error'));

      await expect(tickerClient.listAllTickers({})).rejects.toThrow('Failed to list all tickers: 500 Server Error');
    });
  });

  // ── Alert Ticker APIs (2.2.2) ──

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

    it('should wrap listAllTickers errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(tickerClient.listAllTickers({})).rejects.toThrow('Failed to list all tickers: 500 Internal Server Error');
    });
  });
});
