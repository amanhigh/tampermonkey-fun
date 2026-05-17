import { CanonicalRanker } from '../../src/manager/canonical_ranker';
import { IAlertRepo } from '../../src/repo/alert';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerClient } from '../../src/client/ticker';
import { IPairRepo } from '../../src/repo/pair';
import { ISymbolManager } from '../../src/manager/symbol';
import { PairInfo } from '../../src/models/alert';
import { TickerRecord } from '../../src/models/ticker';

describe('CanonicalRanker', () => {
  let ranker: CanonicalRanker;
  let mockAlertRepo: Partial<IAlertRepo>;
  let mockWatchManager: Partial<IWatchManager>;
  let mockRecentManager: Partial<IRecentManager>;
  let mockTickerClient: Partial<ITickerClient>;
  let mockPairRepo: Partial<IPairRepo>;
  let mockSymbolManager: Partial<ISymbolManager>;

  const createMockRecord = (exchange: string | null): TickerRecord => ({
    ticker: 'T',
    exchange,
    timeframes: ['MN', 'WK', 'DL'],
    type: 'EQUITY',
    state: 'WATCHED',
    trend: 'UPTREND',
    last_opened_at: '2024-01-01T00:00:00Z',
    is_fno: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  });

  beforeEach(() => {
    mockAlertRepo = { get: jest.fn().mockReturnValue(undefined) };
    mockWatchManager = { isWatched: jest.fn().mockReturnValue(false) };
    mockRecentManager = { isRecent: jest.fn().mockReturnValue(false) };
    mockTickerClient = {
      getTicker: jest.fn(),
    };
    mockPairRepo = { getPairInfo: jest.fn().mockReturnValue(null) };
    mockSymbolManager = {
      investingToTv: jest.fn().mockReturnValue(null),
      tvToInvesting: jest.fn().mockReturnValue(null),
    };

    ranker = new CanonicalRanker({
      alertRepo: mockAlertRepo as IAlertRepo,
      watchManager: mockWatchManager as IWatchManager,
      recentManager: mockRecentManager as IRecentManager,
      tickerClient: mockTickerClient as ITickerClient,
      pairRepo: mockPairRepo as IPairRepo,
      symbolManager: mockSymbolManager as ISymbolManager,
    });
  });

  describe('rankInvestingTickers', () => {
    test('returns tickers sorted by score descending', async () => {
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce(null);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('ticker with alerts ranks higher', async () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('TV');
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }, { id: '2' }]);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].alertCount).toBe(2);
    });

    test('watched ticker ranks higher than unwatched', async () => {
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce('B_TV');
      (mockWatchManager.isWatched as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].isWatched).toBe(true);
    });

    test('recently opened ticker ranks higher', async () => {
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce('B_TV');
      (mockRecentManager.isRecent as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].isRecent).toBe(true);
    });

    test('preserves original order when scores are equal', async () => {
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankInvestingTickers(['X', 'Y', 'Z'], '123');
      expect(result.map((r) => r.ticker)).toEqual(['X', 'Y', 'Z']);
    });
  });

  describe('rankTvTickers', () => {
    test('returns tickers sorted by score descending', async () => {
      (mockSymbolManager.tvToInvesting as jest.Mock)
        .mockReturnValueOnce('INV_A')
        .mockReturnValueOnce(null);
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('Test', '123', 'NSE', 'TEST'));
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }]);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('A');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('ticker with exchange ranks higher', async () => {
      (mockTickerClient.getTicker as jest.Mock)
        .mockResolvedValueOnce(createMockRecord('NSE'))
        .mockResolvedValueOnce(createMockRecord(null));

      const result = await ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('A');
      expect(result[0].hasExchange).toBe(true);
      expect(result[1].hasExchange).toBe(false);
    });

    test('fallback ordering when no alerts — uses watchlist, recent, exchange', async () => {
      (mockWatchManager.isWatched as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (mockRecentManager.isRecent as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('B');
      expect(result[0].isWatched).toBe(true);
    });

    test('HTML-encoded tickers get penalized below clean aliases', async () => {
      (mockSymbolManager.tvToInvesting as jest.Mock).mockReturnValue('MAHM');
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('Mahindra', '18273', 'NSE', 'MAHM'));
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }, { id: '2' }]);
      (mockRecentManager.isRecent as jest.Mock).mockReturnValue(true);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankTvTickers(['M_M', 'M&M', 'M&amp;M', 'M&amp;AMP;M']);

      expect(result[0].ticker).toBe('M&M');
      expect(result[1].ticker).toBe('M_M');
      expect(result[2].score).toBeLessThan(0);
      expect(result[3].score).toBeLessThan(0);
    });

    test('preferred exchange bonus ranks NSE ticker above non-exchange ticker', async () => {
      // PTC maps to PTCI investing ticker; PFS has no investing mapping
      (mockSymbolManager.tvToInvesting as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('PTCI');
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('PTC India', '123', 'NSE', 'PTCI'));
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }]);
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord('NSE'));

      const result = await ranker.rankTvTickers(['PFS', 'PTC']);
      expect(result[0].ticker).toBe('PTC');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('none-preferred exchange does not get bonus', async () => {
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord('BSE'));

      const result = await ranker.rankTvTickers(['A', 'B']);
      expect(result[0].score).toBe(result[1].score);
    });

    test('tiebreaker prefers shorter ticker name when scores are equal', async () => {
      (mockTickerClient.getTicker as jest.Mock).mockResolvedValue(createMockRecord(null));

      const result = await ranker.rankTvTickers(['LONGNAME', 'SHORT', 'MID']);
      expect(result.map((r) => r.ticker)).toEqual(['MID', 'SHORT', 'LONGNAME']);
    });
  });
});
