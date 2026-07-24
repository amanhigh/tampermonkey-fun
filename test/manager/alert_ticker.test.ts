import { IAlertTickerManager, AlertTickerManager } from '../../src/manager/alert_ticker';
import { IAlertTickerClient } from '../../src/client/alert_ticker';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { AlertTicker } from '../../src/models/alert_ticker';

describe('AlertTickerManager', () => {
  let manager: IAlertTickerManager;
  let mockAlertTickerClient: jest.Mocked<IAlertTickerClient>;
  let mockProducer: jest.Mocked<IPublisher>;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'INFY',
    pair_id: 'pair1',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    type: 'SECONDARY',
    ticker: 'TV:INFY',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAlertTickerClient = {
      createAlertTicker: jest.fn(),
      getAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
      listAlertTickers: jest.fn(),
      getBaseUrl: jest.fn(),
    } as any;

    mockProducer = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    manager = new AlertTickerManager(mockAlertTickerClient, mockProducer);
  });

  describe('getPrimaryAlertTicker', () => {
    it('should make a single-page request with ticker, type PRIMARY, offset 0, limit 1', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [makeAlertTicker({ type: 'PRIMARY' })],
        metadata: { total: 1, offset: 0, limit: 1 },
      });

      const result = await manager.getPrimaryAlertTicker('TV:INFY');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('PRIMARY');
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledWith({
        ticker: 'TV:INFY',
        type: 'PRIMARY',
        offset: 0,
        limit: 1,
      });
    });

    it('should return null when no PRIMARY exists', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 1 },
      });

      const result = await manager.getPrimaryAlertTicker('TV:INFY');

      expect(result).toBeNull();
    });
  });

  describe('linkAlertTicker', () => {
    it('should create PRIMARY when no existing primary exists', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 1 },
      });
      mockAlertTickerClient.createAlertTicker.mockImplementation((_ticker, data) =>
        Promise.resolve(makeAlertTicker({ ...data } as any))
      );

      const result = await manager.linkAlertTicker('TV:INFY', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        exchange: 'NSE',
      });

      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledWith({
        ticker: 'TV:INFY',
        type: 'PRIMARY',
        offset: 0,
        limit: 1,
      });
      expect(mockAlertTickerClient.createAlertTicker).toHaveBeenCalledWith('TV:INFY', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        type: 'PRIMARY',
        exchange: 'NSE',
      });
      expect(result.type).toBe('PRIMARY');
    });

    it('should create SECONDARY when primary already exists', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [makeAlertTicker({ type: 'PRIMARY', ticker: 'TV:INFY' })],
        metadata: { total: 1, offset: 0, limit: 1 },
      });
      mockAlertTickerClient.createAlertTicker.mockImplementation((_ticker, data) =>
        Promise.resolve(makeAlertTicker({ ...data } as any))
      );

      const result = await manager.linkAlertTicker('TV:INFY', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        exchange: 'NSE',
      });

      expect(mockAlertTickerClient.createAlertTicker).toHaveBeenCalledWith('TV:INFY', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        type: 'SECONDARY',
        exchange: 'NSE',
      });
      expect(result.type).toBe('SECONDARY');
    });

    it('should publish ALERT_TICKER_LINKED after successful create', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 1 },
      });
      const expectedTicker = makeAlertTicker({
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        type: 'PRIMARY',
      });
      mockAlertTickerClient.createAlertTicker.mockResolvedValue(expectedTicker);

      await manager.linkAlertTicker('TV:INFY', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        exchange: 'NSE',
      });

      expect(mockProducer.publish).toHaveBeenCalledTimes(1);
      expect(mockProducer.publish).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_LINKED,
        ticker: 'TV:INFY',
        alertTicker: expectedTicker.symbol,
      });
    });
  });

  describe('getAlertTickers', () => {
    it('should aggregate multiple pages into a single array', async () => {
      mockAlertTickerClient.listAlertTickers
        .mockResolvedValueOnce({
          alert_tickers: [
            makeAlertTicker({ symbol: 'A' }),
            makeAlertTicker({ symbol: 'B' }),
            makeAlertTicker({ symbol: 'C' }),
          ],
          metadata: { total: 5, offset: 0, limit: 3 },
        })
        .mockResolvedValueOnce({
          alert_tickers: [
            makeAlertTicker({ symbol: 'D' }),
            makeAlertTicker({ symbol: 'E' }),
          ],
          metadata: { total: 5, offset: 3, limit: 3 },
        });

      const result = await manager.getAlertTickers();

      expect(result).toHaveLength(5);
      expect(result.map((t) => t.symbol)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledTimes(2);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenNthCalledWith(1, { offset: 0, limit: 100 });
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenNthCalledWith(2, { offset: 100, limit: 100 });
    });

    it('should return empty array when total is 0', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 100 },
      });

      const result = await manager.getAlertTickers();

      expect(result).toEqual([]);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledTimes(1);
    });

    it('should return single page when all items fit', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [makeAlertTicker({ symbol: 'X' }), makeAlertTicker({ symbol: 'Y' })],
        metadata: { total: 2, offset: 0, limit: 100 },
      });

      const result = await manager.getAlertTickers();

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.symbol)).toEqual(['X', 'Y']);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAlertTickersForTicker', () => {
    it('should aggregate multiple pages filtered by ticker', async () => {
      mockAlertTickerClient.listAlertTickers
        .mockResolvedValueOnce({
          alert_tickers: [
            makeAlertTicker({ symbol: 'A', ticker: 'TV:INFY' }),
            makeAlertTicker({ symbol: 'B', ticker: 'TV:INFY' }),
          ],
          metadata: { total: 3, offset: 0, limit: 2 },
        })
        .mockResolvedValueOnce({
          alert_tickers: [
            makeAlertTicker({ symbol: 'C', ticker: 'TV:INFY' }),
          ],
          metadata: { total: 3, offset: 2, limit: 2 },
        });

      const result = await manager.getAlertTickersForTicker('TV:INFY');

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.symbol)).toEqual(['A', 'B', 'C']);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledTimes(2);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenNthCalledWith(1, { ticker: 'TV:INFY', offset: 0, limit: 100 });
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenNthCalledWith(2, { ticker: 'TV:INFY', offset: 100, limit: 100 });
    });

    it('should return empty array when no tickers match', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue({
        alert_tickers: [],
        metadata: { total: 0, offset: 0, limit: 100 },
      });

      const result = await manager.getAlertTickersForTicker('TV:INFY');

      expect(result).toEqual([]);
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledWith({ ticker: 'TV:INFY', offset: 0, limit: 100 });
    });

  });

  describe('deleteAlertTicker', () => {
    it('should delegate delete to AlertTickerClient and publish ALERT_TICKER_DELETED with parent ticker', async () => {
      mockAlertTickerClient.deleteAlertTicker.mockResolvedValue(undefined);

      await manager.deleteAlertTicker('INFY', 'RELIANCE');

      expect(mockAlertTickerClient.deleteAlertTicker).toHaveBeenCalledWith('INFY');
      expect(mockProducer.publish).toHaveBeenCalledTimes(1);
      expect(mockProducer.publish).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_DELETED,
        alertTicker: 'INFY',
        ticker: 'RELIANCE',
      });
    });
  });
});
