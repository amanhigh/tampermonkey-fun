import { InvestingClient, IInvestingClient } from '../client/investing';
import { KiteClient, IKiteClient } from '../client/kite';
import { KohanClient, IKohanClient } from '../client/kohan';
import { UIUtil, IUIUtil } from '../util/ui';
import { ObserveUtil, IObserveUtil } from '../util/observer';
import { SearchUtil, ISearchUtil } from '../util/search';
import { SyncUtil, ISyncUtil } from '../util/sync';
import { KeyUtil, IKeyUtil } from '../util/key';
import { SmartPrompt, ISmartPrompt } from '../util/smart';
import { WaitUtil, IWaitUtil } from '../util/wait';
import { TestApp } from './test';

// Repository Imports
import { RepoCron, IRepoCron } from '../repo/cron';
import { IFlagRepo, FlagRepo } from '../repo/flag';
import { IWatchlistRepo, Watchlistrepo } from '../repo/watch';
import { IPairRepo, PairRepo } from '../repo/pair';
import { IExchangeRepo, ExchangeRepo } from '../repo/exchange';
import { ITickerRepo, TickerRepo } from '../repo/ticker';
import { ISequenceRepo, SequenceRepo } from '../repo/sequence';
import { IAuditRepo, AuditRepo } from '../repo/audit';
import { IRecentTickerRepo, RecentTickerRepo } from '../repo/recent';
import { IAlertRepo, AlertRepo } from '../repo/alert';
import { ICategoryRepo, CategoryRepo } from '../repo/category';

// Manager Layer Imports
import { ITimeFrameManager, TimeFrameManager } from '../manager/timeframe';
import { IAlertManager, AlertManager } from '../manager/alert';
import { IAuditManager, AuditManager } from '../manager/audit';
import { ITradingViewWatchlistManager, TradingViewWatchlistManager } from '../manager/watchlist';
import { ITradingViewScreenerManager, TradingViewScreenerManager } from '../manager/screener';
import { ISequenceManager, SequenceManager } from '../manager/sequence';
import { IPaintManager, PaintManager } from '../manager/paint';
import { ITickerManager, TickerManager } from '../manager/ticker';
import { ISymbolManager, SymbolManager } from '../manager/symbol';
import { ITradingViewManager, TradingViewManager } from '../manager/tv';
import { IPairManager, PairManager } from '../manager/pair';
import { CategoryManager, ICategoryManager } from '../manager/category';

/**
 * Project Architecture Overview
 * ----------------------------
 * Greasemonkey Script Architecture
 * Note: Due to Greasemonkey script constraints, ES6 modules (import/export) are not supported.
 * All code must be in global scope with proper namespacing through classes and factory pattern.
 */
export class Factory {
  /**
   * Instance cache for singletons
   * @private
   */
  private static _instances: Record<string, unknown> = {};

  // TODO: Cyclic Dependency Analysis
  /**
   * Application Layer
   * Core application functionality
   */
  public static app = {
    test: (): TestApp => Factory._getInstance('testApp', () => new TestApp(Factory.util.ui(), Factory.util.key())),
  };

  /**
   * Client Layer
   * Handles external API interactions
   */
  public static client = {
    investing: (): IInvestingClient => Factory._getInstance('investingClient', () => new InvestingClient()),
    kite: (): IKiteClient => Factory._getInstance('kiteClient', () => new KiteClient()),
    kohan: (): IKohanClient => Factory._getInstance('kohanClient', () => new KohanClient()),
  };

  /**
   * Utility Layer
   * Handles utility operations and management
   */
  public static util = {
    wait: (): IWaitUtil => Factory._getInstance('waitUtil', () => new WaitUtil()),
    observer: (): IObserveUtil => Factory._getInstance('observeUtil', () => new ObserveUtil()),
    search: (): ISearchUtil => Factory._getInstance('searchUtil', () => new SearchUtil()),
    sync: (): ISyncUtil => Factory._getInstance('syncUtil', () => new SyncUtil()),
    key: (): IKeyUtil => Factory._getInstance('keyUtil', () => new KeyUtil(Factory.util.sync())),
    smart: (): ISmartPrompt => Factory._getInstance('smartPrompt', () => new SmartPrompt()),
    ui: (): IUIUtil => Factory._getInstance('uiUtil', () => new UIUtil()),
  };

  /**
   * Repository Layer
   * Handles data persistence for various entities
   */
  public static repo = {
    _cron: (): IRepoCron => Factory._getInstance('repoCron', () => new RepoCron()),

    flag: (): IFlagRepo => Factory._getInstance('flagRepo', () => new FlagRepo(Factory.repo._cron())),
    watch: (): IWatchlistRepo => Factory._getInstance('watchRepo', () => new Watchlistrepo(Factory.repo._cron())),
    alert: (): IAlertRepo => Factory._getInstance('alertRepo', () => new AlertRepo(Factory.repo._cron())),
    pair: (): IPairRepo => Factory._getInstance('pairRepo', () => new PairRepo(Factory.repo._cron())),
    exchange: (): IExchangeRepo => Factory._getInstance('exchangeRepo', () => new ExchangeRepo(Factory.repo._cron())),
    ticker: (): ITickerRepo => Factory._getInstance('tickerRepo', () => new TickerRepo(Factory.repo._cron())),
    sequence: (): ISequenceRepo => Factory._getInstance('sequenceRepo', () => new SequenceRepo(Factory.repo._cron())),
    audit: (): IAuditRepo => Factory._getInstance('auditRepo', () => new AuditRepo(Factory.repo._cron())),
    recent: (): IRecentTickerRepo =>
      Factory._getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo._cron())),
    category: (): ICategoryRepo => Factory._getInstance('categoryRepo', () => new CategoryRepo(Factory.repo._cron())),
  };

  /**
   * Manager Layer
   * Handles business logic and orchestration
   */
  public static manager = {
    timeFrame: (): ITimeFrameManager =>
      Factory._getInstance('timeframeManager', () => new TimeFrameManager(Factory.manager.sequence())),

    alert: (): IAlertManager =>
      Factory._getInstance(
        'alertManager',
        () =>
          new AlertManager(
            Factory.repo.alert(),
            Factory.manager.pair(),
            Factory.manager.ticker(),
            Factory.client.investing(),
            Factory.manager.tv()
          )
      ),

    audit: (): IAuditManager =>
      Factory._getInstance(
        'auditManager',
        () =>
          new AuditManager(
            Factory.repo.audit(),
            Factory.manager.symbol(),
            Factory.manager.ticker(),
            Factory.manager.pair(),
            Factory.manager.alert()
          )
      ),

    watchlist: (): ITradingViewWatchlistManager =>
      Factory._getInstance(
        'watchlistManager',
        () =>
          new TradingViewWatchlistManager(
            Factory.manager.paint(),
            Factory.repo.watch(),
            Factory.repo.recent(),
            Factory.util.ui()
          )
      ),

    screener: (): ITradingViewScreenerManager =>
      Factory._getInstance(
        'screenerManager',
        () => new TradingViewScreenerManager(Factory.manager.paint(), Factory.repo.recent(), Factory.repo.watch())
      ),

    sequence: (): ISequenceManager =>
      Factory._getInstance(
        'sequenceManager',
        () => new SequenceManager(Factory.repo.sequence(), Factory.repo.ticker())
      ),

    paint: (): IPaintManager =>
      Factory._getInstance(
        'paintManager',
        () => new PaintManager(Factory.manager.category(), Factory.manager.ticker())
      ),

    ticker: (): ITickerManager =>
      Factory._getInstance(
        'tickerManager',
        () =>
          new TickerManager(
            Factory.repo.recent(),
            Factory.util.wait(),
            Factory.manager.symbol(),
            Factory.manager.screener(),
            Factory.manager.watchlist()
          )
      ),

    category: (): ICategoryManager =>
      Factory._getInstance(
        'categoryManager',
        () => new CategoryManager(Factory.repo.watch(), Factory.repo.category())
    )

    symbol: (): ISymbolManager =>
      Factory._getInstance('symbolManager', () => new SymbolManager(Factory.repo.ticker(), Factory.repo.exchange())),

    tv: (): ITradingViewManager =>
      Factory._getInstance('tvManager', () => new TradingViewManager(Factory.util.ui(), Factory.util.wait())),

    pair: (): IPairManager => Factory._getInstance('pairManager', () => new PairManager(Factory.repo.pair())),
  };

  /**
   * Creates or retrieves a singleton instance
   * @private
   * @param key - Instance identifier
   * @param creator - Factory function
   * @returns Instance of type T
   */
  private static _getInstance<T>(key: string, creator: () => T): T {
    if (!this._instances[key]) {
      try {
        this._instances[key] = creator();
      } catch (error) {
        console.error(`Error creating instance for ${key}:`, error);
        throw error;
      }
    }
    return this._instances[key] as T;
  }
}
