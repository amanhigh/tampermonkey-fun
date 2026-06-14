import { LifecycleManager, ILifecycleManager, StartTrackingRequest } from '../../src/manager/lifecycle';
import { ITickerClient } from '../../src/client/ticker';
import { ICategoryManager } from '../../src/manager/category';
import { IPaintManager } from '../../src/manager/paint';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Ticker } from '../../src/models/ticker';
import { AlertTicker } from '../../src/models/alert_ticker';

describe('LifecycleManager', () => {
  let manager: ILifecycleManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockPublisher: jest.Mocked<IPublisher>;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'INFY',
    pair_id: 'pair1',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    type: 'PRIMARY',
    ticker: 'TV:INFY',
    created_at: '',
    updated_at: '',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerClient = {
      createTicker: jest.fn(),
      deleteTicker: jest.fn(),
      getTicker: jest.fn(),
      patchTickerLastOpened: jest.fn(),
    } as unknown as jest.Mocked<ITickerClient>;

    mockCategoryManager = {
      evictTicker: jest.fn(),
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
      getBatchCategory: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockPaintManager = {
      paint: jest.fn(),
      paintTickers: jest.fn(),
      summarizeBuckets: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockAlertTickerManager = {
      getAlertTickersForTicker: jest.fn(),
      getPrimaryAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      linkAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as unknown as jest.Mocked<IAlertTickerManager>;

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    manager = new LifecycleManager(
      mockTickerClient,
      mockCategoryManager,
      mockPaintManager,
      mockAlertTickerManager,
      mockPublisher
    );
  });

  describe('startTracking', () => {
    it('should evict cache, create ticker, and paint', async () => {
      const createdTicker = new Ticker({ ticker: 'RELIANCE' });
      mockTickerClient.createTicker.mockResolvedValue(createdTicker);

      const data: StartTrackingRequest = {
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: new Date().toISOString(),
      };

      const result = await manager.startTracking(data);

      expect(mockCategoryManager.evictTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockTickerClient.createTicker).toHaveBeenCalledWith(data);
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['RELIANCE']);
      expect(result).toBe(createdTicker);
    });

    it('should publish TICKER_TRACKING_STARTED after successful create', async () => {
      mockTickerClient.createTicker.mockResolvedValue(new Ticker({ ticker: 'RELIANCE' }));

      await manager.startTracking({
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: new Date().toISOString(),
      });

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STARTED,
        ticker: 'RELIANCE',
      });
    });
  });

  describe('stopTracking', () => {
    it('should capture linked alert tickers, publish ALERT_TICKER_DELETED, then delete and paint', async () => {
      const linked = [
        makeAlertTicker({ symbol: 'INFY', ticker: 'RELIANCE' }),
        makeAlertTicker({ symbol: 'RELIANCE.NS', ticker: 'RELIANCE' }),
      ];
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(linked);
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      // Should fetch linked alert tickers before delete
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('RELIANCE');

      // Should publish ALERT_TICKER_DELETED for each linked alert ticker
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_DELETED,
        alertTicker: 'INFY',
      });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.ALERT_TICKER_DELETED,
        alertTicker: 'RELIANCE.NS',
      });

      // Should delete ticker after publishing deletion events
      expect(mockTickerClient.deleteTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['RELIANCE']);

      // Should still publish TICKER_TRACKING_STOPPED for other consumers
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STOPPED,
        ticker: 'RELIANCE',
      });
    });

    it('should handle stop tracking when no linked alert tickers exist', async () => {
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      // Should NOT publish ALERT_TICKER_DELETED when no linked alert tickers
      expect(mockPublisher.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventType.ALERT_TICKER_DELETED })
      );

      // Should still publish TICKER_TRACKING_STOPPED
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STOPPED,
        ticker: 'RELIANCE',
      });
    });
  });
});
