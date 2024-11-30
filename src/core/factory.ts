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

// Manager Layer Imports
import { ITimeFrameManager, TimeFrameManager } from '../manager/timeframe';
import { IAlertManager, AlertManager } from '../manager/alert';
import { IAuditManager, AuditManager } from '../manager/audit';
import { ITradingViewWatchlistManager, TradingViewWatchlistManager } from '../manager/watchlist';
import { ITradingViewScreenerManager, TradingViewScreenerManager } from '../manager/screener';
import { ISequenceManager, SequenceManager } from '../manager/sequence';
import { IPaintManager, PaintManager } from '../manager/paint';
import { ITickerManager, TickerManager } from '../manager/ticker';

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
    dom: (): IWaitUtil => Factory._getInstance('waitUtil', () => new WaitUtil()),
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
    /**
     * Get RepoCron singleton instance
     * @private
     */
    _cron: (): IRepoCron => Factory._getInstance('repoCron', () => new RepoCron()),

    /**
     * Category-based Repositories
     */
    flag: (): IFlagRepo => Factory._getInstance('flagRepo', () => new FlagRepo(Factory.repo._cron())),

    order: (): IWatchlistRepo => Factory._getInstance('orderRepo', () => new Watchlistrepo(Factory.repo._cron())),

    /**
     * Map-based Repositories
     */
    alert: (): IAlertRepo => Factory._getInstance('alertRepo', () => new AlertRepo(Factory.repo._cron())),

    pair: (): IPairRepo => Factory._getInstance('pairRepo', () => new PairRepo(Factory.repo._cron())),

    exchange: (): IExchangeRepo => Factory._getInstance('exchangeRepo', () => new ExchangeRepo(Factory.repo._cron())),

    ticker: (): ITickerRepo => Factory._getInstance('tickerRepo', () => new TickerRepo(Factory.repo._cron())),

    sequence: (): ISequenceRepo => Factory._getInstance('sequenceRepo', () => new SequenceRepo(Factory.repo._cron())),

    audit: (): IAuditRepo => Factory._getInstance('auditRepo', () => new AuditRepo(Factory.repo._cron())),

    /**
     * Set-based Repositories
     */
    recent: (): IRecentTickerRepo =>
      Factory._getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo._cron())),
  };

  /**
   * Manager Layer
   * Handles business logic and orchestration
   */
  public static manager = {
    /**
     * Get TimeFrame manager singleton instance
     */
    timeFrame: (): ITimeFrameManager =>
      Factory._getInstance('timeframeManager', () => new TimeFrameManager(Factory.manager.sequence())),

    /**
     * Get Alert manager singleton instance
     */
    alert: (): IAlertManager =>
      Factory._getInstance(
        'alertManager',
        () => new AlertManager(Factory.repo.alert(), Factory.repo.pair(), Factory.manager.ticker())
      ),

    /**
     * Get Audit manager singleton instance
     */
    audit: (): IAuditManager =>
      Factory._getInstance(
        'auditManager',
        () => new AuditManager(Factory.repo.alert(), Factory.util.ui(), Factory.client.investing())
      ),

    /**
     * Get TradingView watchlist manager singleton instance
     */
    watchlist: (): ITradingViewWatchlistManager =>
      Factory._getInstance(
        'watchlistManager',
        () =>
          new TradingViewWatchlistManager(
            Factory.manager.paint(),
            Factory.repo.order(),
            Factory.repo.recent(),
            Factory.util.ui()
          )
      ),

    /**
     * Get TradingView screener manager singleton instance
     */
    screener: (): ITradingViewScreenerManager =>
      Factory._getInstance(
        'screenerManager',
        () => new TradingViewScreenerManager(Factory.manager.paint(), Factory.repo.recent(), Factory.repo.order())
      ),

    // Keep existing managers here
    sequence: (): ISequenceManager =>
      Factory._getInstance(
        'sequenceManager',
        () => new SequenceManager(Factory.repo.sequence(), Factory.repo.ticker())
      ),

    paint: (): IPaintManager =>
      Factory._getInstance('paintManager', () => new PaintManager(Factory.repo.category(), Factory.manager.ticker())),

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
