import { DisplayHandler } from '../../src/handler/display';
import { IDomManager } from '../../src/manager/dom';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { IAlertBar } from '../../src/handler/alert_bar';
import { AlertTicker } from '../../src/models/alert_ticker';
import { ApiError, wrapClientError } from '../../src/models/api_error';
import { ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

// ── Helpers ──

const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
  symbol: 'INVESTINGTICKER',
  pair_id: 'pair1',
  name: 'Test Pair',
  exchange: 'NSE',
  type: 'SECONDARY',
  ticker: 'TVTICKER',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ── Tests ──

describe('DisplayHandler', () => {
  let handler: DisplayHandler;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockAlertBar: jest.Mocked<IAlertBar>;

  beforeEach(() => {
    mockDomManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
    } as any;

    mockAlertBar = {
      render: jest.fn(),
    };

    handler = new DisplayHandler(mockDomManager, mockAlertTickerManager, mockAlertBar);
  });

  describe('display', () => {
    it('should fetch alert tickers and delegate rendering to alertBar', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      const tickers = [makeAlertTicker({ type: 'PRIMARY', symbol: 'INFY', ticker: 'TVTICKER' })];
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(tickers);

      await handler.display();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TVTICKER');
      expect(mockAlertBar.render).toHaveBeenCalledWith({
        tvTicker: 'TVTICKER',
        alertTickers: tickers,
        isUntracked: false,
      });
    });

    it('should pass empty alertTickers for unmapped ticker', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockAlertBar.render).toHaveBeenCalledWith({
        tvTicker: 'TVTICKER',
        alertTickers: [],
        isUntracked: false,
      });
    });

    it('should pass the current ticker from domManager', async () => {
      mockDomManager.getTicker.mockReturnValue('BANKNIFTY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await handler.display();

      expect(mockAlertBar.render).toHaveBeenCalledWith(
        expect.objectContaining({ tvTicker: 'BANKNIFTY' })
      );
    });

    it('should set isUntracked when backend returns ticker-not-found 404', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      const apiError = new ApiError(404, 'Ticker not found');
      const wrapped = wrapClientError(apiError, 'Failed to list all Alert tickers');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(wrapped);

      await handler.display();

      expect(mockAlertBar.render).toHaveBeenCalledWith({
        tvTicker: 'BHEL',
        alertTickers: [],
        isUntracked: true,
      });
    });

    it('should rethrow non-404 errors instead of marking untracked', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(
        new Error('500 Internal Server Error')
      );

      await expect(handler.display()).rejects.toThrow('500 Internal Server Error');
    });

    it('should not call alertBar.render when a non-404 error is thrown', async () => {
      mockDomManager.getTicker.mockReturnValue('BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(
        new Error('Network failure')
      );

      await expect(handler.display()).rejects.toThrow();

      expect(mockAlertBar.render).not.toHaveBeenCalled();
    });
  });

  describe('registerEvents', () => {
    let mockSubscriber: jest.Mocked<ISubscriber>;

    beforeEach(() => {
      mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };
    });

    it('should subscribe to all four domain events', () => {
      handler.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [
          DomainEventType.TICKER_CHANGED,
          DomainEventType.TICKER_TRACKING_STOPPED,
          DomainEventType.ALERT_TICKER_LINKED,
          DomainEventType.ALERT_TICKER_DELETED,
        ],
        expect.any(Function)
      );
    });

    it('should call display when any subscribed event fires', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      handler.registerEvents(mockSubscriber);

      const callback = mockSubscriber.subscribeMany.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TVTICKER');
      expect(mockAlertBar.render).toHaveBeenCalled();
    });
  });
});
