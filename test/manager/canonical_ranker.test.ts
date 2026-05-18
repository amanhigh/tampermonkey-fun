import { CanonicalRanker, CanonicalRankerDeps } from '../../src/manager/canonical_ranker';
import { IAlertRepo } from '../../src/repo/alert';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { IAlertTickerClient } from '../../src/client/alert_ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { TickerRecord } from '../../src/models/ticker';

describe('CanonicalRanker', () => {
  let ranker: CanonicalRanker;
  let deps: CanonicalRankerDeps;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockAlertTickerClient: jest.Mocked<IAlertTickerClient>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    mockAlertRepo = {
      get: jest.fn().mockReturnValue([]),
    } as any;

    mockWatchManager = {
      isWatched: jest.fn().mockReturnValue(false),
    } as any;

    mockRecentManager = {
      isRecent: jest.fn().mockReturnValue(false),
    } as any;

    mockTickerClient = {
      getTicker: jest.fn().mockRejectedValue(new Error('Not found')),
    } as any;

    mockAlertTickerClient = {
      getAlertTicker: jest.fn(),
      listAlertTickers: jest.fn(),
      createAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as any;

    mockSymbolManager = {
      investingToTv: jest.fn().mockReturnValue(null),
      tvToInvesting: jest.fn().mockReturnValue(null),
    } as any;

    deps = {
      alertRepo: mockAlertRepo,
      watchManager: mockWatchManager,
      recentManager: mockRecentManager,
      tickerClient: mockTickerClient,
      alertTickerClient: mockAlertTickerClient,
      symbolManager: mockSymbolManager,
    };

    ranker = new CanonicalRanker(deps);
  });

  describe('rankInvestingTickers', () => {
    it('returns sorted tickers by score descending', async () => {
      mockSymbolManager.investingToTv.mockImplementation((t) => t);
      mockAlertRepo.get.mockReturnValue([{ id: 'a', price: 1, pairId: 'p', name: 'a' }]); // 1 alert

      const result = await ranker.rankInvestingTickers(['TICKER_A', 'TICKER_B'], 'pair1');

      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });
  });

  describe('rankTvTickers', () => {
    it('returns sorted tv tickers by score', async () => {
      mockAlertRepo.get.mockReturnValue([]);
      mockTickerClient.getTicker.mockResolvedValue({
        exchange: 'NSE',
      } as TickerRecord);

      const result = await ranker.rankTvTickers(['TICKER1', 'TICKER2']);

      expect(result).toHaveLength(2);
    });

    it('prefers ticker with alert ticker mapping', async () => {
      mockSymbolManager.tvToInvesting.mockImplementation((t) => t === 'MAPPED' ? 'INV_MAPPED' : null);
      mockAlertTickerClient.getAlertTicker.mockResolvedValue({
        symbol: 'INV_MAPPED',
        pair_id: 'pair1',
        name: 'Mapped',
        exchange: 'NSE',
        created_at: '',
        updated_at: '',
      });

      const result = await ranker.rankTvTickers(['MAPPED', 'UNMAPPED']);

      const mapped = result.find((r) => r.ticker === 'MAPPED');
      const unmapped = result.find((r) => r.ticker === 'UNMAPPED');
      expect(mapped!.score).toBeGreaterThan(unmapped!.score);
    });
  });
});
