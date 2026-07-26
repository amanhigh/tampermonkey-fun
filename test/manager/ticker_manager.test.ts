import { ITickerManager, TickerManager } from '../../src/manager/ticker';
import { ITickerClient } from '../../src/client/ticker';
import { TickerListResponse, Ticker, TickerType, TickerState, TickerTrend } from '../../src/models/ticker';
import { IPublisher } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

/** Helper to create a TickerListResponse fixture. */
function makeTickerListResponse(
  tickers: Array<{ ticker: string; exchange?: string }>,
  total: number,
  offset: number,
  limit: number
): TickerListResponse {
  return {
    tickers: tickers.map((t) =>
      new Ticker({
        ticker: t.ticker,
        exchange: t.exchange ?? '',
        timeframes: [],
        type: TickerType.EQUITY,
        state: TickerState.WATCHED,
        trend: TickerTrend.SIDEWAYS,
        last_opened_at: '',
        is_fno: false,
        created_at: '',
        updated_at: '',
      })
    ),
    metadata: { total, offset, limit },
  };
}

describe('TickerManager', () => {
  let manager: ITickerManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockPublisher: jest.Mocked<IPublisher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerClient = {
      getBaseUrl: jest.fn(),
      createTicker: jest.fn(),
      getTicker: jest.fn(),
      updateTicker: jest.fn(),
      patchTickerLastOpened: jest.fn(),
      deleteTicker: jest.fn(),
      listTickers: jest.fn(),
    } as unknown as jest.Mocked<ITickerClient>;

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    manager = new TickerManager(mockTickerClient, mockPublisher);
  });

  // ── listTickers (multi-page aggregation) ──

  describe('listTickers', () => {
    it('should aggregate multiple pages into a single Ticker array', async () => {
      mockTickerClient.listTickers
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'A' }, { ticker: 'B' }, { ticker: 'C' }],
          5, 0, 100
        ))
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'D' }, { ticker: 'E' }],
          5, 3, 100
        ));

      const result = await manager.listTickers({});

      expect(result).toHaveLength(5);
      expect(result.map((t) => t.ticker)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(mockTickerClient.listTickers).toHaveBeenCalledTimes(2);
    });

    it('should forward offset and limit to each client call', async () => {
      mockTickerClient.listTickers
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'A' }],
          3, 0, 100
        ))
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'B' }],
          3, 100, 100
        ))
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'C' }],
          3, 200, 100
        ));

      await manager.listTickers({});

      expect(mockTickerClient.listTickers).toHaveBeenNthCalledWith(1, { offset: 0, limit: 100 });
      expect(mockTickerClient.listTickers).toHaveBeenNthCalledWith(2, { offset: 100, limit: 100 });
      expect(mockTickerClient.listTickers).toHaveBeenNthCalledWith(3, { offset: 200, limit: 100 });
    });

    it('should preserve caller filters across all pages', async () => {
      mockTickerClient.listTickers
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'A' }],
          2, 0, 100
        ))
        .mockResolvedValueOnce(makeTickerListResponse(
          [{ ticker: 'B' }],
          2, 100, 100
        ));

      await manager.listTickers({ exchange: 'NSE', 'is-fno': true });

      expect(mockTickerClient.listTickers).toHaveBeenNthCalledWith(1, { exchange: 'NSE', 'is-fno': true, offset: 0, limit: 100 });
      expect(mockTickerClient.listTickers).toHaveBeenNthCalledWith(2, { exchange: 'NSE', 'is-fno': true, offset: 100, limit: 100 });
    });

    it('should return empty array when total is 0', async () => {
      mockTickerClient.listTickers.mockResolvedValue(
        makeTickerListResponse([], 0, 0, 100)
      );

      const result = await manager.listTickers({});

      expect(result).toEqual([]);
      expect(mockTickerClient.listTickers).toHaveBeenCalledTimes(1);
    });

    it('should return single page when all items fit', async () => {
      mockTickerClient.listTickers.mockResolvedValue(
        makeTickerListResponse(
          [{ ticker: 'X' }, { ticker: 'Y' }],
          2, 0, 100
        )
      );

      const result = await manager.listTickers({});

      expect(result).toHaveLength(2);
      expect(result.map((t) => t.ticker)).toEqual(['X', 'Y']);
      expect(mockTickerClient.listTickers).toHaveBeenCalledTimes(1);
    });

    it('should stop early when items collected >= total', async () => {
      // Backend returns more items than total indicates (edge case)
      mockTickerClient.listTickers.mockResolvedValue(
        makeTickerListResponse(
          [{ ticker: 'A' }, { ticker: 'B' }, { ticker: 'C' }],
          3, 0, 100
        )
      );

      const result = await manager.listTickers({});

      expect(result).toHaveLength(3);
      expect(mockTickerClient.listTickers).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from client', async () => {
      mockTickerClient.listTickers.mockRejectedValue(new Error('Network failure'));

      await expect(manager.listTickers({})).rejects.toThrow('Network failure');
    });
  });

  // ── getTicker ──

  describe('getTicker', () => {
    it('should delegate to tickerClient.getTicker', async () => {
      const fakeTicker = { ticker: 'MCX', qualifiedName: 'NSE:MCX' } as any;
      mockTickerClient.getTicker.mockResolvedValue(fakeTicker);

      const result = await manager.getTicker('MCX');

      expect(mockTickerClient.getTicker).toHaveBeenCalledWith('MCX');
      expect(result).toBe(fakeTicker);
    });
  });

  // ── markRecent ──

  describe('markRecent', () => {
    it('should call patchTickerLastOpened with current ISO timestamp', async () => {
      mockTickerClient.patchTickerLastOpened.mockResolvedValue({} as any);

      await manager.markRecent('MCX');

      expect(mockTickerClient.patchTickerLastOpened).toHaveBeenCalledTimes(1);
      const [, payload] = mockTickerClient.patchTickerLastOpened.mock.calls[0];
      expect(payload.last_opened_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  // ── setExchange ──

  describe('setExchange', () => {
    it('should update ticker and publish metadata changed event', async () => {
      const updatedTicker = { ticker: 'MCX', exchange: 'NSE' } as any;
      mockTickerClient.updateTicker.mockResolvedValue(updatedTicker);

      const result = await manager.setExchange('MCX', 'NSE');

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('MCX', { exchange: 'NSE' });
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.TICKER_METADATA_CHANGED,
        ticker: 'MCX',
      });
      expect(result).toBe(updatedTicker);
    });
  });
});
