import { LifecycleManager, ILifecycleManager, StartTrackingRequest } from '../../src/manager/lifecycle';
import { ITickerClient } from '../../src/client/ticker';
import { ICategoryManager } from '../../src/manager/category';
import { IPaintManager } from '../../src/manager/paint';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Ticker } from '../../src/models/ticker';

describe('LifecycleManager', () => {
  let manager: ILifecycleManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockPublisher: jest.Mocked<IPublisher>;

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

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    manager = new LifecycleManager(
      mockTickerClient,
      mockCategoryManager,
      mockPaintManager,
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
    it('should evict cache, delete ticker, paint, and publish event', async () => {
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      expect(mockCategoryManager.evictTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockTickerClient.deleteTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['RELIANCE']);
      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STOPPED,
        ticker: 'RELIANCE',
      });
    });
  });
});
