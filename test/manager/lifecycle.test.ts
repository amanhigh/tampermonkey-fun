import { LifecycleManager, ILifecycleManager, StartTrackingRequest } from '../../src/manager/lifecycle';
import { ITickerClient } from '../../src/client/ticker';
import { IPriceAlertClient } from '../../src/client/price_alert';
import { PriceAlert } from '../../src/models/price_alert';
import { IInvestingClient } from '../../src/client/investing';
import { ICategoryManager } from '../../src/manager/category';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Ticker, TickerType, TickerState, TickerTrend } from '../../src/models/ticker';
import { TickerTimeframe } from '../../src/models/timeframe';
import { AlertTicker } from '../../src/models/alert_ticker';
import { Alert } from '../../src/models/alert';
import { Constants } from '../../src/models/constant';

describe('LifecycleManager', () => {
  let manager: ILifecycleManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockPublisher: jest.Mocked<IPublisher>;
  let mockPriceAlertClient: jest.Mocked<IPriceAlertClient>;
  let mockInvestingClient: jest.Mocked<IInvestingClient>;

  /** Helper: build a page response for listPriceAlerts. */
  const pageResponse = (alerts: PriceAlert[], total: number, offset: number) => ({
    alerts,
    metadata: { total, offset, limit: Constants.KOHAN.PRICE_ALERT_PAGE_LIMIT },
  });

  const PAGE_LIMIT = Constants.KOHAN.PRICE_ALERT_PAGE_LIMIT;

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

  const makePriceAlert = (overrides: Partial<PriceAlert> = {}): PriceAlert => ({
    alert_id: 'alert-1',
    pair_id: 'pair1',
    trigger_price: 100,
    created_at: '2026-01-01T00:00:00Z',
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

    mockPriceAlertClient = {
      listPriceAlerts: jest.fn().mockResolvedValue([]),
      deletePriceAlert: jest.fn().mockResolvedValue(undefined),
      createPendingPriceAlert: jest.fn(),
      replacePriceAlerts: jest.fn(),
    } as unknown as jest.Mocked<IPriceAlertClient>;

    mockInvestingClient = {
      deleteAlert: jest.fn().mockResolvedValue(undefined),
      createAlert: jest.fn(),
      fetchSymbolData: jest.fn(),
      getAllAlerts: jest.fn(),
    } as unknown as jest.Mocked<IInvestingClient>;

    manager = new LifecycleManager(
      mockTickerClient,
      mockCategoryManager,
      mockAlertTickerManager,
      mockPublisher,
      mockPriceAlertClient,
      mockInvestingClient
    );
  });

  describe('startTracking', () => {
    it('should evict cache, create ticker, and paint', async () => {
      const createdTicker = new Ticker({ ticker: 'RELIANCE' });
      mockTickerClient.createTicker.mockResolvedValue(createdTicker);

      const data: StartTrackingRequest = {
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: [TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL],
        type: TickerType.EQUITY,
        state: TickerState.WATCHED,
        trend: TickerTrend.SIDEWAYS,
        last_opened_at: new Date().toISOString(),
      };

      const result = await manager.startTracking(data);

      expect(mockCategoryManager.evictTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockTickerClient.createTicker).toHaveBeenCalledWith(data);
      expect(result).toBe(createdTicker);
    });

    it('should publish TICKER_TRACKING_STARTED after successful create', async () => {
      mockTickerClient.createTicker.mockResolvedValue(new Ticker({ ticker: 'RELIANCE' }));

      await manager.startTracking({
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: [TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL],
        type: TickerType.EQUITY,
        state: TickerState.WATCHED,
        trend: TickerTrend.SIDEWAYS,
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
    it('should delete remote/backend alerts, linked alert tickers, then ticker', async () => {
      const linked = [
        makeAlertTicker({ symbol: 'INFY', ticker: 'RELIANCE' }),
        makeAlertTicker({ symbol: 'RELIANCE.NS', ticker: 'RELIANCE' }),
      ];
      const alerts: PriceAlert[] = [
        makePriceAlert({ alert_id: 'alert-1', pair_id: 'pair1' }),
        makePriceAlert({ alert_id: 'alert-2', pair_id: 'pair2' }),
      ];

      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(linked);
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue(pageResponse(alerts, 2, 0));
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      // 1. Evict category cache
      expect(mockCategoryManager.evictTicker).toHaveBeenCalledWith('RELIANCE');

      // 2. Fetch linked alert tickers
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('RELIANCE');

      // 3. Fetch backend price alerts with manager-supplied offset/limit
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });

      // 4. Delete remote Investing.com alerts (fail-fast)
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(2);
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(new Alert('alert-1', '', 0));
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledWith(new Alert('alert-2', '', 0));

      // 5. Delete backend price alerts (fail-fast)
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledTimes(2);
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledWith('alert-1');
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledWith('alert-2');

      // 6. Explicitly delete linked alert tickers via manager
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY', 'RELIANCE');
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('RELIANCE.NS', 'RELIANCE');

      // 7. Delete primary ticker
      expect(mockTickerClient.deleteTicker).toHaveBeenCalledWith('RELIANCE');

      // 8. Publish TICKER_TRACKING_STOPPED
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STOPPED,
        ticker: 'RELIANCE',
      });
    });

    it('should aggregate alerts across multiple pages during cleanup', async () => {
      const linked = [makeAlertTicker({ symbol: 'INFY', ticker: 'RELIANCE' })];
      const page1Alerts: PriceAlert[] = Array.from({ length: PAGE_LIMIT }, (_, i) =>
        makePriceAlert({ alert_id: `alert-${i}`, pair_id: 'pair1' })
      );
      const page2Alerts: PriceAlert[] = Array.from({ length: 3 }, (_, i) =>
        makePriceAlert({ alert_id: `alert-${PAGE_LIMIT + i}`, pair_id: 'pair2' })
      );

      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(linked);
      mockPriceAlertClient.listPriceAlerts
        .mockResolvedValueOnce(pageResponse(page1Alerts, PAGE_LIMIT + 3, 0))
        .mockResolvedValueOnce(pageResponse(page2Alerts, PAGE_LIMIT + 3, PAGE_LIMIT));
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      // Both pages fetched with correct offsets
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledTimes(2);
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenNthCalledWith(1, {
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenNthCalledWith(2, {
        ticker: 'RELIANCE',
        offset: PAGE_LIMIT,
        limit: PAGE_LIMIT,
      });

      // All alerts across both pages deleted
      expect(mockInvestingClient.deleteAlert).toHaveBeenCalledTimes(PAGE_LIMIT + 3);
      expect(mockPriceAlertClient.deletePriceAlert).toHaveBeenCalledTimes(PAGE_LIMIT + 3);
    });

    it('should handle stop tracking when no linked alert tickers exist', async () => {
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue(pageResponse([], 0, 0));
      mockTickerClient.deleteTicker.mockResolvedValue(undefined);

      await manager.stopTracking('RELIANCE');

      // Manager still passes offset/limit even when no results expected
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });

      // No price alerts to delete
      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
      expect(mockPriceAlertClient.deletePriceAlert).not.toHaveBeenCalled();

      // No alert tickers to delete
      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();

      // Still deletes ticker and publishes stopped
      expect(mockTickerClient.deleteTicker).toHaveBeenCalledWith('RELIANCE');
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_TRACKING_STOPPED,
        ticker: 'RELIANCE',
      });
    });

    it('should reject stop tracking when pending alerts exist', async () => {
      const alerts: PriceAlert[] = [
        makePriceAlert({ alert_id: 'alert-1', pair_id: 'pair1' }),
        makePriceAlert({ alert_id: '', pair_id: 'pair2' }), // pending — no remote counterpart
      ];

      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue(pageResponse(alerts, 2, 0));

      await expect(manager.stopTracking('RELIANCE')).rejects.toThrow('pending');

      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });

      // No cleanup should happen
      expect(mockInvestingClient.deleteAlert).not.toHaveBeenCalled();
      expect(mockPriceAlertClient.deletePriceAlert).not.toHaveBeenCalled();
      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
      expect(mockTickerClient.deleteTicker).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventType.TICKER_TRACKING_STOPPED })
      );
    });

    it('should fail stop tracking and not delete ticker when remote Investing alert deletion fails', async () => {
      const alerts: PriceAlert[] = [makePriceAlert({ alert_id: 'alert-1' })];

      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue(pageResponse(alerts, 1, 0));
      mockInvestingClient.deleteAlert.mockRejectedValue(new Error('Network error'));

      await expect(manager.stopTracking('RELIANCE')).rejects.toThrow('Network error');

      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });

      // Should NOT delete ticker after failure
      expect(mockTickerClient.deleteTicker).not.toHaveBeenCalled();

      // Should NOT publish TICKER_TRACKING_STOPPED
      expect(mockPublisher.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventType.TICKER_TRACKING_STOPPED })
      );
    });

    it('should fail stop tracking and not delete ticker when backend price alert deletion fails', async () => {
      const priceAlerts = [
        makePriceAlert({ alert_id: 'alert-1' }),
        makePriceAlert({ alert_id: 'alert-2' }),
      ];

      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      mockPriceAlertClient.listPriceAlerts.mockResolvedValue(pageResponse(priceAlerts, 2, 0));
      // First remote delete succeeds, second backend delete fails
      mockPriceAlertClient.deletePriceAlert
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Backend 500'));

      await expect(manager.stopTracking('RELIANCE')).rejects.toThrow('Backend 500');

      // Manager supplies offset/limit to listPriceAlerts
      expect(mockPriceAlertClient.listPriceAlerts).toHaveBeenCalledWith({
        ticker: 'RELIANCE',
        offset: 0,
        limit: PAGE_LIMIT,
      });

      // Should NOT delete ticker after failure
      expect(mockTickerClient.deleteTicker).not.toHaveBeenCalled();

      // Should NOT publish TICKER_TRACKING_STOPPED
      expect(mockPublisher.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: DomainEventType.TICKER_TRACKING_STOPPED })
      );
    });
  });
});
