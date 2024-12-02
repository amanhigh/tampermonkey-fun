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
import { Barkat } from './barkat';

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
import { ISymbolManager, SymbolManager } from '../manager/symbol';
import { ITradingViewManager, TradingViewManager } from '../manager/tv';
import { IPairManager, PairManager } from '../manager/pair';
import { FnoRepo, IFnoRepo } from '../repo/fno';

// Handler Imports
import { AlertHandler } from '../handler/alert';
import { AlertSummaryHandler, IAlertSummaryHandler } from '../handler/alert_summary';
import { AuditHandler, IAuditHandler } from '../handler/audit';
import { HotkeyHandler, IHotkeyHandler } from '../handler/hotkey';
import { KeyConfig } from '../handler/key_config';
import { IModifierKeyConfig, ModifierKeyConfig } from '../handler/modifier_config';
import { IPairHandler, PairHandler } from '../handler/pair';
import { ISequenceHandler, SequenceHandler } from '../handler/sequence';
import { IKiteHandler, KiteHandler } from '../handler/kite';
import { IKiteManager, KiteManager } from '../manager/kite';
import { IHeaderManager, HeaderManager } from '../manager/header';

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
    barkat: (): Barkat => Factory._getInstance('barkat', () => new Barkat(Factory.util.ui())),
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
    fno: (): IFnoRepo => Factory._getInstance('fnoRepo', () => new FnoRepo(Factory.repo._cron())),
    recent: (): IRecentTickerRepo =>
      Factory._getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo._cron())),
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
            Factory.util.ui(),
            Factory.repo.fno()
          )
      ),
    header: (): IHeaderManager =>
      Factory._getInstance(
        'headerManager',
        () =>
          new HeaderManager(
            Factory.manager.paint(),
            Factory.manager.category(),
            Factory.manager.ticker(),
            Factory.repo.fno()
          )
      ),

    screener: (): ITradingViewScreenerManager =>
      Factory._getInstance(
        'screenerManager',
        () => new TradingViewScreenerManager(Factory.manager.paint(), Factory.repo.fno())
      ),

    sequence: (): ISequenceManager =>
      Factory._getInstance(
        'sequenceManager',
        () => new SequenceManager(Factory.repo.sequence(), Factory.manager.tv(), Factory.manager.ticker())
      ),

    paint: (): IPaintManager => Factory._getInstance('paintManager', () => new PaintManager()),

    ticker: (): ITickerManager =>
      Factory._getInstance(
        'tickerManager',
        () =>
          new TickerManager(
            Factory.util.wait(),
            Factory.manager.symbol(),
            Factory.manager.screener(),
            Factory.manager.watchlist()
          )
      ),
    kite: (): IKiteManager =>
      Factory._getInstance('kiteManager', () => new KiteManager(Factory.manager.symbol(), Factory.client.kite())),

    symbol: (): ISymbolManager =>
      Factory._getInstance('symbolManager', () => new SymbolManager(Factory.repo.ticker(), Factory.repo.exchange())),

    tv: (): ITradingViewManager => Factory._getInstance('tvManager', () => new TradingViewManager(Factory.util.wait())),

    pair: (): IPairManager => Factory._getInstance('pairManager', () => new PairManager(Factory.repo.pair())),
  };

  /**
   * Handler Layer
   * Handles specific operations and user interactions
   */
  public static handler = {
    alert: (): AlertHandler =>
      Factory._getInstance('alertHandler', () => new AlertHandler(Factory.manager.alert(), Factory.manager.tv())),
    alertSummary: (): IAlertSummaryHandler =>
      Factory._getInstance(
        'alertSummaryHandler',
        () => new AlertSummaryHandler(Factory.manager.alert(), Factory.manager.tv(), Factory.util.ui())
      ),
    audit: (): IAuditHandler =>
      Factory._getInstance(
        'auditHandler',
        () => new AuditHandler(Factory.manager.audit(), Factory.manager.pair(), Factory.util.ui())
      ),
    hotkey: (): IHotkeyHandler =>
      Factory._getInstance(
        'hotkeyHandler',
        () => new HotkeyHandler(Factory.util.key(), Factory.handler.keyConfig(), Factory.handler.modifierKeyConfig())
      ),
    kite: (): IKiteHandler =>
      Factory._getInstance('kiteHandler', () => new KiteHandler(Factory.manager.kite(), Factory.manager.symbol())),
    keyConfig: (): KeyConfig =>
      Factory._getInstance(
        'keyConfig',
        () => new KeyConfig(Factory.manager.tv(), Factory.manager.sequence(), Factory.manager.category())
      ),
    modifierKeyConfig: (): IModifierKeyConfig =>
      Factory._getInstance(
        'modifierKeyConfig',
        () => new ModifierKeyConfig(Factory.manager.category(), Factory.manager.tv())
      ),
    pair: (): IPairHandler =>
      Factory._getInstance(
        'pairHandler',
        () =>
          new PairHandler(
            Factory.client.investing(),
            Factory.manager.pair(),
            Factory.util.smart(),
            Factory.manager.alert()
          )
      ),

    sequence: (): ISequenceHandler =>
      Factory._getInstance(
        'sequenceHandler',
        () => new SequenceHandler(Factory.manager.sequence(), Factory.manager.ticker())
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
