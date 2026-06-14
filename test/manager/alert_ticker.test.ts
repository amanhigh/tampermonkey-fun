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
    it('should query listAlertTickers with ticker and type PRIMARY', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue([makeAlertTicker({ type: 'PRIMARY' })]);

      const result = await manager.getPrimaryAlertTicker('TV:INFY');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('PRIMARY');
      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledWith({
        ticker: 'TV:INFY',
        type: 'PRIMARY',
      });
    });

    it('should return null when no PRIMARY exists', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue([]);

      const result = await manager.getPrimaryAlertTicker('TV:INFY');

      expect(result).toBeNull();
    });
  });

  describe('linkAlertTicker', () => {
    it('should create PRIMARY when no existing primary exists', async () => {
      mockAlertTickerClient.listAlertTickers.mockResolvedValue([]);
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
      mockAlertTickerClient.listAlertTickers.mockResolvedValue([
        makeAlertTicker({ type: 'PRIMARY', ticker: 'TV:INFY' }),
      ]);
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
      mockAlertTickerClient.listAlertTickers.mockResolvedValue([]);
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
    it('should list all alert tickers with no filters', async () => {
      const tickers = [makeAlertTicker()];
      mockAlertTickerClient.listAlertTickers.mockResolvedValue(tickers);

      const result = await manager.getAlertTickers();

      expect(mockAlertTickerClient.listAlertTickers).toHaveBeenCalledWith({});
      expect(result).toEqual(tickers);
    });
  });

  describe('deleteAlertTicker', () => {
    it('should delegate delete to AlertTickerClient and publish ALERT_TICKER_DELETED', async () => {
      mockAlertTickerClient.deleteAlertTicker.mockResolvedValue(undefined);

      await manager.deleteAlertTicker('', 'INFY');

      expect(mockAlertTickerClient.deleteAlertTicker).toHaveBeenCalledWith('INFY');
      expect(mockProducer.publish).toHaveBeenCalledTimes(1);
      expect(mockProducer.publish).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_DELETED,
        ticker: '',
        alertTicker: 'INFY',
      });
    });
  });
});
