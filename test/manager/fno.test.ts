import { FnoManager, IFnoManager } from '../../src/manager/fno';
import { ITickerClient } from '../../src/client/ticker';
import { TickerListResponse } from '../../src/models/ticker';

describe('FnoManager', () => {
  let fnoManager: IFnoManager;
  let mockClient: jest.Mocked<ITickerClient>;

  const mockTickerListResponse: TickerListResponse = {
    tickers: [
      { ticker: 'NIFTY', is_fno: true, exchange: 'NSE', timeframes: ['MN', 'WK', 'DL'], type: 'INDEX', state: 'WATCHED', trend: 'UPTREND', last_opened_at: '2026-05-05T10:30:00Z', created_at: '2026-05-05T10:30:00Z', updated_at: '2026-05-05T10:30:00Z' },
      { ticker: 'BANKNIFTY', is_fno: true, exchange: 'NSE', timeframes: ['MN', 'WK', 'DL'], type: 'INDEX', state: 'WATCHED', trend: 'SIDEWAYS', last_opened_at: '2026-05-05T10:30:00Z', created_at: '2026-05-05T10:30:00Z', updated_at: '2026-05-05T10:30:00Z' },
      { ticker: 'RELIANCE', is_fno: true, exchange: 'NSE', timeframes: ['MN', 'WK', 'DL'], type: 'EQUITY', state: 'WATCHED', trend: 'UPTREND', last_opened_at: '2026-05-05T10:30:00Z', created_at: '2026-05-05T10:30:00Z', updated_at: '2026-05-05T10:30:00Z' },
    ],
    metadata: { total: 3, offset: 0, limit: 500 },
  };

  beforeEach(() => {
    mockClient = {
      listTickers: jest.fn().mockResolvedValue(mockTickerListResponse),
    } as unknown as jest.Mocked<ITickerClient>;

    fnoManager = new FnoManager(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with tickerClient dependency', () => {
      expect(fnoManager).toBeDefined();
      expect(fnoManager).toBeInstanceOf(FnoManager);
    });

    it('should trigger cache load from backend on construction', () => {
      expect(mockClient.listTickers).toHaveBeenCalledWith({ 'is-fno': true, limit: 500 });
    });
  });

  describe('isFno', () => {
    it('should return true for ticker present in cache', () => {
      expect(fnoManager.isFno('NIFTY')).toBe(true);
    });

    it('should return false for ticker not in cache', () => {
      expect(fnoManager.isFno('TCS')).toBe(false);
    });

    it('should return false for empty cache when backend fails', () => {
      mockClient.listTickers.mockRejectedValue(new Error('Backend unavailable'));
      const emptyManager = new FnoManager(mockClient);
      expect(emptyManager.isFno('NIFTY')).toBe(false);
    });
  });

  describe('getAllFnoTickers', () => {
    it('should return all cached FNO tickers', () => {
      const tickers = fnoManager.getAllFnoTickers();
      expect(tickers).toEqual(new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']));
    });

    it('should return a copy of cache (not internal reference)', () => {
      const tickers = fnoManager.getAllFnoTickers();
      tickers.add('MUTATED');
      expect(fnoManager.getAllFnoTickers()).toEqual(new Set(['NIFTY', 'BANKNIFTY', 'RELIANCE']));
    });

    it('should return empty set when cache is empty', () => {
      mockClient.listTickers.mockResolvedValue({ tickers: [], metadata: { total: 0, offset: 0, limit: 500 } });
      const emptyManager = new FnoManager(mockClient);
      expect(emptyManager.getAllFnoTickers()).toEqual(new Set());
    });
  });

});
