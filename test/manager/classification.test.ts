import {
  WatchClassifier,
  FlagClassifier,
} from '../../src/manager/classification';
import { Ticker } from '../../src/models/ticker';
import { WatchCategoryId } from '../../src/models/watch';
import { FlagCategoryId } from '../../src/models/flag';

// ════════════════════════════════════════════
// Watch Category Helper Tests
// ════════════════════════════════════════════

describe('WatchClassifier.findByTicker', () => {
  function makeCatTicker(overrides: Partial<Ticker>): Ticker {
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
      const ticker = makeCatTicker({ state: 'READY' });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.READY);
    });

    it('classifies COMPOSITE ticker as COMPOSITE (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'CNXMIDCAP/USDINR/XAUUSD*100',
        type: 'COMPOSITE',
        timeframes: ['SMN', 'TMN', 'MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.COMPOSITE);
    });

    it('classifies INDEX ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'NIFTY',
        type: 'INDEX',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.INDEX);
    });

    it('classifies COMMODITY ticker with no DL timeframes as INDEX (type before timeframe)', () => {
      const ticker = makeCatTicker({
        ticker: 'GOLD',
        type: 'COMMODITY',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.INDEX);
    });

    it('classifies FX ticker with no DL timeframes as INDEX', () => {
      const ticker = makeCatTicker({
        ticker: 'EURUSD',
        type: 'FX',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.INDEX);
    });

    it('classifies BOND ticker with no DL timeframes as INDEX', () => {
      const ticker = makeCatTicker({
        ticker: 'US10Y',
        type: 'BOND',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.INDEX);
    });

    it('classifies NSE EQUITY ticker with no DL timeframes as LONG_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'RELIANCE',
        type: 'EQUITY',
        exchange: 'NSE',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.LONG_NSE);
    });

    it('classifies non-NSE EQUITY ticker with no DL timeframes as LONG_NON_NSE', () => {
      const ticker = makeCatTicker({
        ticker: 'AAPL',
        type: 'EQUITY',
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK'],
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('returns undefined for EQUITY ticker with DL timeframes (default daily)', () => {
      const ticker = makeCatTicker({
        ticker: 'DAILY',
        type: 'EQUITY',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
      });

      expect(WatchClassifier.findByTicker(ticker)).toBeUndefined();
    });

    it('returns LONG_NON_NSE for default Ticker constructor (empty timeframes string, non-NSE exchange)', () => {
      const ticker = new Ticker({ ticker: 'UNT' });
      // Ticker defaults: timeframes=[], type=EQUITY, state=WATCHED, exchange=''
      // Empty timeframes → no DL → isLongWatch=true
      // exchange='' → not NSE → LONG_NON_NSE
      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.LONG_NON_NSE);
    });

    it('returns INDEX for BOND ticker (market type before timeframe check)', () => {
      const ticker = makeCatTicker({
        ticker: 'US10Y',
        type: 'BOND',
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.INDEX);
    });

    it('treats COMPOSITE as market for isMarket-like priority', () => {
      const ticker = makeCatTicker({
        ticker: 'GOLD/SILVER',
        type: 'COMPOSITE',
        state: 'WATCHED',
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.COMPOSITE);
    });
  });

  describe('state takes priority over type and timeframes', () => {
    it('returns READY even for COMPOSITE type when state=READY', () => {
      const ticker = makeCatTicker({
        ticker: 'CNX/XAU',
        type: 'COMPOSITE',
        state: 'READY',
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.READY);
    });

    it('returns READY even for INDEX type when state=READY', () => {
      const ticker = makeCatTicker({
        ticker: 'NIFTY',
        type: 'INDEX',
        state: 'READY',
      });

      expect(WatchClassifier.findByTicker(ticker)?.id).toBe(WatchCategoryId.READY);
    });
  });
});

describe('WatchClassifier.findById', () => {
  it('returns RUNNING for RUNNING id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.RUNNING);

    expect(cat.id).toBe(WatchCategoryId.RUNNING);
    expect(cat.color).toBe('lime');
    expect(cat.label).toBe('Running Trades (Journal)');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns READY for READY id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.READY);

    expect(cat.id).toBe(WatchCategoryId.READY);
    expect(cat.color).toBe('red');
    expect(cat.label).toBe('Ready');
    expect(cat.recordUpdate).toEqual({ state: 'READY' });
  });

  it('returns INDEX for INDEX id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.INDEX);

    expect(cat.id).toBe(WatchCategoryId.INDEX);
    expect(cat.color).toBe('brown');
    expect(cat.label).toBe('Index');
    expect(cat.recordUpdate).toEqual({ type: 'INDEX' });
  });

  it('returns SET_JOURNAL for SET_JOURNAL id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.SET_JOURNAL);

    expect(cat.id).toBe(WatchCategoryId.SET_JOURNAL);
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns LONG_NSE for LONG_NSE id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.LONG_NSE);

    expect(cat.id).toBe(WatchCategoryId.LONG_NSE);
    expect(cat.color).toBe('dodgerblue');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns LONG_NON_NSE for LONG_NON_NSE id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.LONG_NON_NSE);

    expect(cat.id).toBe(WatchCategoryId.LONG_NON_NSE);
    expect(cat.color).toBe('cyan');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns DEFAULT_DAILY for DEFAULT_DAILY id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.DEFAULT_DAILY);

    expect(cat.id).toBe(WatchCategoryId.DEFAULT_DAILY);
    expect(cat.color).toBe('white');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns COMPOSITE for COMPOSITE id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.COMPOSITE);

    expect(cat.id).toBe(WatchCategoryId.COMPOSITE);
    expect(cat.color).toBe('darkkhaki');
    expect(cat.recordUpdate).toBeNull();
  });

  it('returns BLACKLISTED for BLACKLISTED id', () => {
    const cat = WatchClassifier.findById(WatchCategoryId.BLACKLISTED);

    expect(cat.id).toBe(WatchCategoryId.BLACKLISTED);
    expect(cat.color).toBe('dimgrey');
    expect(cat.recordUpdate).toEqual({ state: 'BLACKLIST' });
  });

  it('throws for invalid id', () => {
    expect(() => WatchClassifier.findById('INVALID' as WatchCategoryId)).toThrow('Invalid watch category id: INVALID');
  });
});

// ════════════════════════════════════════════
// Flag Category Helper Tests
// ════════════════════════════════════════════

describe('FlagClassifier.findByTicker', () => {
  function makeFlagTicker(overrides: Partial<Ticker> = {}): Ticker {
    return new Ticker({
      ticker: 'TEST',
      exchange: '',
      timeframes: [],
      type: 'EQUITY',
      state: 'WATCHED',
      trend: 'SIDEWAYS',
      ...overrides,
    });
  }

  it('resolves GOLD_INDEX for XAUUSD index ticker', () => {
    const ticker = makeFlagTicker({
      ticker: 'XAUUSD',
      type: 'INDEX',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.GOLD_INDEX);
  });

  it('resolves GOLD_INDEX for GOLDSILVER composite ticker', () => {
    const ticker = makeFlagTicker({
      ticker: 'GOLDSILVER',
      type: 'COMPOSITE',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.GOLD_INDEX);
  });

  it('resolves INDEX for non-gold market instrument', () => {
    const ticker = makeFlagTicker({
      ticker: 'NIFTY',
      type: 'INDEX',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('resolves INDEX for COMMODITY type', () => {
    const ticker = makeFlagTicker({
      ticker: 'CRUDEOIL',
      type: 'COMMODITY',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('resolves INDEX for FX type', () => {
    const ticker = makeFlagTicker({
      ticker: 'EURUSD',
      type: 'FX',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('resolves CRYPTO for CRYPTO type', () => {
    const ticker = makeFlagTicker({
      ticker: 'BTC',
      type: 'CRYPTO',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.CRYPTO);
  });

  it('resolves UPTREND for UPTREND trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'BULL',
      trend: 'UPTREND',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.UPTREND);
  });

  it('resolves SIDEWAYS for SIDEWAYS trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'RANGE',
      trend: 'SIDEWAYS',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.SIDEWAYS);
  });

  it('resolves DOWNTREND for DOWNTREND trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'BEAR',
      trend: 'DOWNTREND',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.DOWNTREND);
  });

  it('returns undefined for non-market EQUITY that is not GOLD_INDEX/INDEX/CRYPTO and has no trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'UNKNOWN',
      type: 'EQUITY',
      trend: undefined,
    });

    expect(FlagClassifier.findByTicker(ticker)).toBeUndefined();
  });

  it('enforces category priority: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND', () => {
    // CRYPTO ticker with UPTREND trend — GOLD_INDEX and INDEX do not match (EQUITY)
    const ticker = makeFlagTicker({
      ticker: 'BTC',
      type: 'CRYPTO',
      trend: 'UPTREND',
    });

    // Highest priority that matches is CRYPTO (not UPTREND)
    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.CRYPTO);
  });

  it('prefers INDEX over UPTREND for market instrument with trend', () => {
    const ticker = makeFlagTicker({
      ticker: 'NIFTY',
      type: 'INDEX',
      trend: 'UPTREND',
    });

    // INDEX is higher priority than UPTREND
    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.INDEX);
  });

  it('prefers GOLD_INDEX over INDEX for gold symbol', () => {
    const ticker = makeFlagTicker({
      ticker: 'XAUUSD',
      type: 'INDEX',
      trend: 'SIDEWAYS',
    });

    expect(FlagClassifier.findByTicker(ticker)?.id).toBe(FlagCategoryId.GOLD_INDEX);
  });
});

describe('FlagClassifier.findById', () => {
  it('returns valid category for SIDEWAYS', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.SIDEWAYS);

    expect(cat.id).toBe(FlagCategoryId.SIDEWAYS);
    expect(cat.color).toBe('orange');
    expect(cat.label).toBe('Sideways / Consolidation');
  });

  it('returns valid category for DOWNTREND', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.DOWNTREND);

    expect(cat.id).toBe(FlagCategoryId.DOWNTREND);
    expect(cat.color).toBe('red');
  });

  it('returns valid category for CRYPTO', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.CRYPTO);

    expect(cat.id).toBe(FlagCategoryId.CRYPTO);
    expect(cat.color).toBe('dodgerblue');
  });

  it('returns valid category for UPTREND', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.UPTREND);

    expect(cat.id).toBe(FlagCategoryId.UPTREND);
    expect(cat.color).toBe('lime');
  });

  it('returns valid category for INDEX', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.INDEX);

    expect(cat.id).toBe(FlagCategoryId.INDEX);
    expect(cat.color).toBe('brown');
  });

  it('returns valid category for GOLD_INDEX', () => {
    const cat = FlagClassifier.findById(FlagCategoryId.GOLD_INDEX);

    expect(cat.id).toBe(FlagCategoryId.GOLD_INDEX);
    expect(cat.color).toBe('darkkhaki');
  });

  it('throws for invalid id', () => {
    expect(() => FlagClassifier.findById('INVALID' as FlagCategoryId)).toThrow('Invalid flag category id: INVALID');
  });
});
