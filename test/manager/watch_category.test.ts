import { resolveWatchCategory } from '../../src/manager/watch_category';
import { Ticker } from '../../src/models/ticker';
import { WatchCategoryId } from '../../src/models/watch';

describe('resolveWatchCategory', () => {
  describe('TYPE takes priority over timeframe-based LONG classification', () => {
    const makeTicker = (overrides: Partial<Ticker>): Ticker =>
      new Ticker({
        ticker: 'TEST',
        exchange: null,
        timeframes: ['MN', 'WK'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        ...overrides,
      });

    it('classifies CNXMIDCAP/USDINR/XAUUSD*100 as COMPOSITE not LONG_NON_NSE', () => {
      // Real backend response for this ticker: type=COMPOSITE, timeframes=[SMN,TMN,MN,WK], exchange=null, state=WATCHED
      const ticker = makeTicker({
        ticker: 'CNXMIDCAP/USDINR/XAUUSD*100',
        type: 'COMPOSITE',
        exchange: null,
        timeframes: ['SMN', 'TMN', 'MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.COMPOSITE);
    });

    it('classifies an INDEX ticker with no DL timeframes as INDEX not LONG_NSE/LONG_NON_NSE', () => {
      const ticker = makeTicker({
        ticker: 'NIFTY',
        type: 'INDEX',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });

    it('classifies a COMMODITY ticker with no DL timeframes as INDEX not LONG_NSE/LONG_NON_NSE', () => {
      const ticker = makeTicker({
        ticker: 'GOLD',
        type: 'COMMODITY',
        exchange: null,
        timeframes: ['WK'],
      });

      expect(resolveWatchCategory(ticker)).toBe(WatchCategoryId.INDEX);
    });
  });
});
