import { CanonicalRanker, CanonicalRankerDeps } from '../../src/manager/canonical_ranker';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { Ticker } from '../../src/models/ticker';

describe('CanonicalRanker', () => {
  let ranker: CanonicalRanker;
  let deps: CanonicalRankerDeps;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;

  beforeEach(() => {
    mockWatchManager = {
      isWatched: jest.fn().mockReturnValue(false),
    } as any;

    mockRecentManager = {
      isRecent: jest.fn().mockReturnValue(false),
    } as any;

    mockTickerClient = {
      getTicker: jest.fn().mockRejectedValue(new Error('Not found')),
    } as any;

    mockAlertTickerManager = {
      getAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as any;

    deps = {
      watchManager: mockWatchManager,
      recentManager: mockRecentManager,
      tickerClient: mockTickerClient,
      alertTickerManager: mockAlertTickerManager,
    };

    ranker = new CanonicalRanker(deps);
  });

  describe('rankInvestingTickers', () => {
    it('returns sorted tickers by score descending', async () => {
      mockAlertTickerManager.fetchAlertTicker
        .mockResolvedValueOnce({ ticker: 'TICKER_A' } as any)
        .mockResolvedValueOnce({ ticker: null } as any);

      const result = await ranker.rankInvestingTickers(['TICKER_A', 'TICKER_B']);

      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });

    it('prefers ticker with pair mapping', async () => {
      mockAlertTickerManager.fetchAlertTicker
        .mockResolvedValueOnce({ ticker: 'MAPPED_TV' } as any)  // has pair mapping
        .mockResolvedValueOnce(null);                              // no mapping

      const result = await ranker.rankInvestingTickers(['MAPPED', 'UNMAPPED']);

      const mapped = result.find((r) => r.ticker === 'MAPPED');
      const unmapped = result.find((r) => r.ticker === 'UNMAPPED');
      expect(mapped!.score).toBeGreaterThan(unmapped!.score);
    });
  });

  describe('rankTvTickers', () => {
    it('returns sorted tv tickers by score', async () => {
      mockTickerClient.getTicker.mockResolvedValue({
        exchange: 'NSE',
      } as Ticker);

      const result = await ranker.rankTvTickers(['TICKER1', 'TICKER2']);

      expect(result).toHaveLength(2);
    });

    it('prefers ticker with alert ticker mapping', async () => {
      mockAlertTickerManager.getAlertTicker
        .mockResolvedValueOnce({ symbol: 'INV_MAPPED' } as any)
        .mockResolvedValueOnce(null);

      const result = await ranker.rankTvTickers(['MAPPED', 'UNMAPPED']);

      const mapped = result.find((r) => r.ticker === 'MAPPED');
      const unmapped = result.find((r) => r.ticker === 'UNMAPPED');
      expect(mapped!.score).toBeGreaterThan(unmapped!.score);
    });

    it('prefers ticker with backend exchange record', async () => {
      mockTickerClient.getTicker
        .mockResolvedValueOnce({ exchange: 'NSE' } as Ticker)  // has exchange
        .mockRejectedValueOnce(new Error('Not found'));          // no exchange

      const result = await ranker.rankTvTickers(['WITH_EXCH', 'NO_EXCH']);

      const withExch = result.find((r) => r.ticker === 'WITH_EXCH');
      const noExch = result.find((r) => r.ticker === 'NO_EXCH');
      expect(withExch!.score).toBeGreaterThan(noExch!.score);
    });

    it('prefers watched ticker', async () => {
      mockWatchManager.isWatched.mockImplementation((t) => t === 'WATCHED');

      const result = await ranker.rankTvTickers(['WATCHED', 'UNWATCHED']);

      const watched = result.find((r) => r.ticker === 'WATCHED');
      const unwatched = result.find((r) => r.ticker === 'UNWATCHED');
      expect(watched!.score).toBeGreaterThan(unwatched!.score);
    });

    it('prefers shorter ticker name as tiebreaker', async () => {
      const result = await ranker.rankTvTickers(['LONGER_NAME', 'SHORT']);

      expect(result[0].ticker).toBe('SHORT');
      expect(result[1].ticker).toBe('LONGER_NAME');
    });

    it('penalizes HTML-encoded ticker names', async () => {
      const result = await ranker.rankTvTickers(['NORMAL', 'M&amp;M']);

      const normal = result.find((r) => r.ticker === 'NORMAL');
      const encoded = result.find((r) => r.ticker === 'M&amp;M');
      expect(normal!.score).toBeGreaterThan(encoded!.score);
    });

    it('adds bonus for raw ampersand tickers', async () => {
      const result = await ranker.rankTvTickers(['PLAIN', 'M&M', 'M&amp;M']);

      const plain = result.find((r) => r.ticker === 'PLAIN');
      const raw = result.find((r) => r.ticker === 'M&M');
      const encoded = result.find((r) => r.ticker === 'M&amp;M');
      expect(raw!.score).toBeGreaterThan(plain!.score);
      expect(plain!.score).toBeGreaterThan(encoded!.score);
    });
  });
});
