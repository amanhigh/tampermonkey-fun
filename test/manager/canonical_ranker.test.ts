import { CanonicalRanker } from '../../src/manager/canonical_ranker';
import { IAlertRepo } from '../../src/repo/alert';
import { IWatchManager } from '../../src/manager/watch';
import { IRecentTickerRepo } from '../../src/repo/recent';
import { ISequenceRepo } from '../../src/repo/sequence';
import { IExchangeRepo } from '../../src/repo/exchange';
import { IPairRepo } from '../../src/repo/pair';
import { ISymbolManager } from '../../src/manager/symbol';
import { PairInfo } from '../../src/models/alert';

describe('CanonicalRanker', () => {
  let ranker: CanonicalRanker;
  let mockAlertRepo: Partial<IAlertRepo>;
  let mockWatchManager: Partial<IWatchManager>;
  let mockRecentRepo: Partial<IRecentTickerRepo>;
  let mockSequenceRepo: Partial<ISequenceRepo>;
  let mockExchangeRepo: Partial<IExchangeRepo>;
  let mockPairRepo: Partial<IPairRepo>;
  let mockSymbolManager: Partial<ISymbolManager>;

  beforeEach(() => {
    mockAlertRepo = { get: jest.fn().mockReturnValue(undefined) };
    mockWatchManager = { isWatched: jest.fn().mockReturnValue(false) };
    mockRecentRepo = { get: jest.fn().mockReturnValue(undefined) };
    mockSequenceRepo = { has: jest.fn().mockReturnValue(false) };
    mockExchangeRepo = { has: jest.fn().mockReturnValue(false), get: jest.fn().mockReturnValue(undefined) };
    mockPairRepo = { getPairInfo: jest.fn().mockReturnValue(null) };
    mockSymbolManager = {
      investingToTv: jest.fn().mockReturnValue(null),
      tvToInvesting: jest.fn().mockReturnValue(null),
    };

    ranker = new CanonicalRanker({
      alertRepo: mockAlertRepo as IAlertRepo,
      watchManager: mockWatchManager as IWatchManager,
      recentRepo: mockRecentRepo as IRecentTickerRepo,
      sequenceRepo: mockSequenceRepo as ISequenceRepo,
      exchangeRepo: mockExchangeRepo as IExchangeRepo,
      pairRepo: mockPairRepo as IPairRepo,
      symbolManager: mockSymbolManager as ISymbolManager,
    });
  });

  describe('rankInvestingTickers', () => {
    test('returns tickers sorted by score descending', () => {
      // A has TV mapping, B does not
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce(null);

      const result = ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('ticker with alerts ranks higher', () => {
      (mockSymbolManager.investingToTv as jest.Mock).mockReturnValue('TV');
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }, { id: '2' }]);

      const result = ranker.rankInvestingTickers(['A', 'B'], '123');
      // Both share same pairId so both get same alert count
      expect(result[0].alertCount).toBe(2);
    });

    test('watched ticker ranks higher than unwatched', () => {
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce('B_TV');
      (mockWatchManager.isWatched as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].isWatched).toBe(true);
    });

    test('recently opened ticker ranks higher', () => {
      (mockSymbolManager.investingToTv as jest.Mock)
        .mockReturnValueOnce('A_TV')
        .mockReturnValueOnce('B_TV');
      (mockRecentRepo.get as jest.Mock)
        .mockReturnValueOnce(Date.now())
        .mockReturnValueOnce(undefined);

      const result = ranker.rankInvestingTickers(['A', 'B'], '123');
      expect(result[0].ticker).toBe('A');
      expect(result[0].recentTimestamp).toBeGreaterThan(0);
    });

    test('preserves original order when scores are equal', () => {
      const result = ranker.rankInvestingTickers(['X', 'Y', 'Z'], '123');
      // All have score 0, stable sort preserves order
      expect(result.map((r) => r.ticker)).toEqual(['X', 'Y', 'Z']);
    });
  });

  describe('rankTvTickers', () => {
    test('returns tickers sorted by score descending', () => {
      (mockSymbolManager.tvToInvesting as jest.Mock)
        .mockReturnValueOnce('INV_A')
        .mockReturnValueOnce(null);
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('Test', '123', 'NSE', 'TEST'));
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }]);

      const result = ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('A');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('ticker with sequence and exchange ranks higher', () => {
      (mockSequenceRepo.has as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (mockExchangeRepo.has as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('A');
      expect(result[0].hasSequence).toBe(true);
      expect(result[0].hasExchange).toBe(true);
    });

    test('fallback ordering when no alerts — uses watchlist, recent, sequence, exchange', () => {
      // No alerts for either
      (mockWatchManager.isWatched as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (mockRecentRepo.get as jest.Mock)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(Date.now());

      const result = ranker.rankTvTickers(['A', 'B']);
      expect(result[0].ticker).toBe('B');
      expect(result[0].isWatched).toBe(true);
    });

    test('HTML-encoded tickers get penalized below clean aliases', () => {
      // All map to same investing ticker with same alerts
      (mockSymbolManager.tvToInvesting as jest.Mock).mockReturnValue('MAHM');
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('Mahindra', '18273', 'NSE', 'MAHM'));
      (mockAlertRepo.get as jest.Mock).mockReturnValue([{ id: '1' }, { id: '2' }]);
      (mockRecentRepo.get as jest.Mock).mockReturnValue(Date.now());

      const result = ranker.rankTvTickers(['M_M', 'M&M', 'M&amp;M', 'M&amp;AMP;M']);

      // M&M should win (clean, shortest among non-penalized)
      expect(result[0].ticker).toBe('M&M');
      // M_M second (clean but longer)
      expect(result[1].ticker).toBe('M_M');
      // HTML-encoded tickers last (penalized)
      expect(result[2].score).toBeLessThan(0);
      expect(result[3].score).toBeLessThan(0);
    });

    test('preferred exchange bonus ranks NSE ticker above non-exchange ticker', () => {
      // PTC has NSE exchange data, PFS does not
      (mockSymbolManager.tvToInvesting as jest.Mock).mockReturnValue('PTCI');
      (mockPairRepo.getPairInfo as jest.Mock).mockReturnValue(new PairInfo('PTC India', '123', 'NSE', 'PTCI'));
      (mockExchangeRepo.has as jest.Mock).mockImplementation((t: string) => t === 'PTC');
      (mockExchangeRepo.get as jest.Mock).mockImplementation((t: string) => (t === 'PTC' ? 'NSE:PTC' : undefined));

      const result = ranker.rankTvTickers(['PFS', 'PTC']);
      expect(result[0].ticker).toBe('PTC');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    test('non-preferred exchange does not get bonus', () => {
      (mockExchangeRepo.has as jest.Mock).mockReturnValue(true);
      (mockExchangeRepo.get as jest.Mock).mockImplementation((t: string) => `BSE:${t}`);

      const result = ranker.rankTvTickers(['A', 'B']);
      // Both have BSE (non-preferred), same score — no bonus applied
      expect(result[0].score).toBe(result[1].score);
    });

    test('tiebreaker prefers shorter ticker name when scores are equal', () => {
      const result = ranker.rankTvTickers(['LONGNAME', 'SHORT', 'MID']);
      // All score 0, tiebreaker by length: SHORT (5) < MID (3) < LONGNAME (8)
      expect(result[0].ticker).toBe('MID');
      expect(result[1].ticker).toBe('SHORT');
      expect(result[2].ticker).toBe('LONGNAME');
    });
  });
});
