import { resolveWatchCategory, findWatchCategoryById } from '../../src/manager/watch_category';
import { Ticker } from '../../src/models/ticker';
import { WatchCategoryId } from '../../src/models/watch';

describe('resolveWatchCategory', () => {
  /**
   * Shared ticker builder. Defaults to an EQUITY, WATCHED ticker
   * with DL timeframes (daily) so it falls through to undefined.
   * Override specific fields per test.
   */
  function makeTicker(overrides: Partial<Ticker>): Ticker {
    return new Ticker({
      ticker: 'TEST',
      exchange: '',
      timeframes: ['MN', 'WK', 'DL'],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'SIDEWAYS',
      ...overrides,
    });
  }

  describe('classified by state, type, then timeframes', () => {
    it('classifies READY state ticker as READY', () => {
      const ticker = makeTicker({ state: 'READY' });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.READY);
    });

    it('classifies COMPOSITE ticker as COMPOSITE (type before timeframe)', () => {
      const ticker = makeTicker({
        ticker: 'CNXMIDCAP/USDINR/XAUUSD*100',
        type: 'COMPOSITE',
        timeframes: ['SMN', 'TMN', 'MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.COMPOSITE);
    });

    it('classifies INDEX ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeTicker({
        ticker: 'NIFTY',
        type: 'INDEX',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies COMMODITY ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeTicker({
        ticker: 'GOLD',
        type: 'COMMODITY',
        timeframes: ['WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies EQUITY NSE ticker with no DL timeframe as LONG_NSE', () => {
      const ticker = makeTicker({
        ticker: 'RELIANCE',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NSE);
    });

    it('classifies EQUITY non-NSE ticker with no DL timeframe as LONG_NON_NSE', () => {
      const ticker = makeTicker({
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('returns undefined for daily-watch ticker (has DL, no special state/type)', () => {
      const ticker = makeTicker({
        ticker: 'DL_TICKER',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
      });

      expect(resolveWatchCategory(ticker)).toBeUndefined();
    });
  });
});

describe('findWatchCategoryById', () => {
  it('returns the matching WatchCategory for a valid ID', () => {
    const cat = findWatchCategoryById(WatchCategoryId.LONG_NSE);

    expect(cat.id).toBe(WatchCategoryId.LONG_NSE);
    expect(cat.color).toBe('dodgerblue');
    expect(cat.label).toBe('Long Watch (India)');
  });

  it('throws an error for an invalid WatchCategoryId', () => {
    expect(() => findWatchCategoryById('BOGUS_ID' as WatchCategoryId)).toThrow(
      'Invalid watch category id: BOGUS_ID'
    );
  });
});
