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
import { ExperimentApp } from './experiment';
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
import { IJournalManager, JournalManager } from '../manager/journal';
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
import { IFnoManager, FnoManager } from '../manager/fno';

// Handler Imports
import { AlertHandler } from '../handler/alert';
import { AlertSummaryHandler, IAlertSummaryHandler } from '../handler/alert_summary';
import { AuditHandler, IAuditHandler } from '../handler/audit';
import { JournalHandler, IJournalHandler } from '../handler/journal';
import { HotkeyHandler, IHotkeyHandler } from '../handler/hotkey';
import { KeyConfig } from '../handler/key_config';
import { IModifierKeyConfig, ModifierKeyConfig } from '../handler/modifier_config';
import { IPairHandler, PairHandler } from '../handler/pair';
import { ISequenceHandler, SequenceHandler } from '../handler/sequence';
import { IKiteHandler, KiteHandler } from '../handler/kite';
import { IKiteManager, KiteManager } from '../manager/kite';
import { IHeaderManager, HeaderManager } from '../manager/header';
import { IStyleManager, StyleManager } from '../manager/style';
import { IFlagManager, FlagManager } from '../manager/flag';
import { IRecentManager, RecentManager } from '../manager/recent';
import { IWatchManager, WatchManager } from '../manager/watch';
import { IWatchListHandler, WatchListHandler } from '../handler/watchlist';
import { IOnLoadHandler, OnLoadHandler } from '../handler/onload';
import { IFlagHandler, FlagHandler } from '../handler/flag';
import { IKiteRepo, KiteRepo } from '../repo/kite';
import { ITickerHandler, TickerHandler } from '../handler/ticker';
import { ITickerChangeHandler, TickerChangeHandler } from '../handler/ticker_change';
import { ISwiftKeyHandler, SwiftKeyHandler } from '../handler/swiftkey';
import { ICommandInputHandler, CommandInputHandler } from '../handler/command';
import { AlertFeedHandler, IAlertFeedHandler } from '../handler/alertfeed';

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

  /**
   * Application Layer
   * Core application functionality
   */
  public static app = {
    test: (): ExperimentApp =>
      Factory._getInstance('testApp', () => new ExperimentApp(Factory.util.ui(), Factory.util.key())),
    barkat: (): Barkat =>
      Factory._getInstance(
        'barkat',
        () =>
          new Barkat(
            Factory.util.ui(),
            Factory.repo.cron(),
            Factory.handler.sequence(),
            Factory.handler.onload(),
            Factory.handler.alert(),
            Factory.handler.journal(),
            Factory.handler.command(),
            Factory.handler.kite(),
            Factory.handler.ticker(),
            Factory.handler.alertFeed()
          )
      ),
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
    cron: (): IRepoCron => Factory._getInstance('repoCron', () => new RepoCron()),

    flag: (): IFlagRepo => Factory._getInstance('flagRepo', () => new FlagRepo(Factory.repo.cron())),
    watch: (): IWatchlistRepo => Factory._getInstance('watchRepo', () => new Watchlistrepo(Factory.repo.cron())),
    alert: (): IAlertRepo => Factory._getInstance('alertRepo', () => new AlertRepo(Factory.repo.cron())),
    pair: (): IPairRepo => Factory._getInstance('pairRepo', () => new PairRepo(Factory.repo.cron())),
    exchange: (): IExchangeRepo => Factory._getInstance('exchangeRepo', () => new ExchangeRepo(Factory.repo.cron())),
    ticker: (): ITickerRepo => Factory._getInstance('tickerRepo', () => new TickerRepo(Factory.repo.cron())),
    sequence: (): ISequenceRepo => Factory._getInstance('sequenceRepo', () => new SequenceRepo(Factory.repo.cron())),
    audit: (): IAuditRepo => Factory._getInstance('auditRepo', () => new AuditRepo(Factory.repo.cron())),
    fno: (): IFnoRepo => Factory._getInstance('fnoRepo', () => new FnoRepo(Factory.repo.cron())),
    kite: (): IKiteRepo => Factory._getInstance('kiteRepo', () => new KiteRepo()),
    recent: (): IRecentTickerRepo =>
      Factory._getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo.cron())),
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
            Factory.util.ui(),
            Factory.repo.fno(),
            Factory.manager.watch(),
            Factory.manager.flag()
          )
      ),

    header: (): IHeaderManager =>
      Factory._getInstance(
        'headerManager',
        () =>
          new HeaderManager(
            Factory.manager.paint(),
            Factory.manager.watch(),
            Factory.manager.flag(),
            Factory.manager.ticker(),
            Factory.repo.fno()
          )
      ),

    watch: (): IWatchManager => Factory._getInstance('watchManager', () => new WatchManager(Factory.repo.watch())),

    screener: (): ITradingViewScreenerManager =>
      Factory._getInstance(
        'screenerManager',
        () => new TradingViewScreenerManager(Factory.manager.paint(), Factory.manager.watch(), Factory.manager.flag())
      ),

    sequence: (): ISequenceManager =>
      Factory._getInstance(
        'sequenceManager',
        () => new SequenceManager(Factory.repo.sequence(), Factory.manager.ticker())
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
      Factory._getInstance(
        'kiteManager',
        () => new KiteManager(Factory.manager.symbol(), Factory.client.kite(), Factory.repo.kite())
      ),

    symbol: (): ISymbolManager =>
      Factory._getInstance('symbolManager', () => new SymbolManager(Factory.repo.ticker(), Factory.repo.exchange())),

    tv: (): ITradingViewManager => Factory._getInstance('tvManager', () => new TradingViewManager(Factory.util.wait())),

    pair: (): IPairManager => Factory._getInstance('pairManager', () => new PairManager(Factory.repo.pair())),

    style: (): IStyleManager =>
      Factory._getInstance('styleManager', () => new StyleManager(Factory.util.wait(), Factory.manager.timeFrame())),

    flag: (): IFlagManager =>
      Factory._getInstance('flagManager', () => new FlagManager(Factory.repo.flag(), Factory.manager.paint())),

    recent: (): IRecentManager =>
      Factory._getInstance('recentManager', () => new RecentManager(Factory.repo.recent(), Factory.manager.paint())),
    journal: (): IJournalManager =>
      Factory._getInstance(
        'journalManager',
        () => new JournalManager(Factory.manager.watch(), Factory.manager.sequence(), Factory.client.kohan())
      ),
    fno: (): IFnoManager => Factory._getInstance('fnoManager', () => new FnoManager(Factory.repo.fno())),
  };

  /**
   * Handler Layer
   * Handles specific operations and user interactions
   */
  public static handler = {
    alert: (): AlertHandler =>
      Factory._getInstance(
        'alertHandler',
        () =>
          new AlertHandler(
            Factory.manager.alert(),
            Factory.manager.tv(),
            Factory.handler.audit(),
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.util.sync(),
            Factory.util.ui(),
            Factory.handler.alertSummary(),
            Factory.handler.ticker(),
            Factory.handler.pair()
          )
      ),
    alertSummary: (): IAlertSummaryHandler =>
      Factory._getInstance(
        'alertSummaryHandler',
        () => new AlertSummaryHandler(Factory.manager.alert(), Factory.manager.tv(), Factory.util.ui())
      ),
    audit: (): IAuditHandler =>
      Factory._getInstance(
        'auditHandler',
        () =>
          new AuditHandler(Factory.manager.audit(), Factory.manager.pair(), Factory.util.ui(), Factory.handler.ticker())
      ),
    onload: (): IOnLoadHandler =>
      Factory._getInstance(
        'onloadHandler',
        () =>
          new OnLoadHandler(
            Factory.util.wait(),
            Factory.util.observer(),
            Factory.handler.watchlist(),
            Factory.handler.hotkey(),
            Factory.handler.alert(),
            Factory.handler.tickerChange(),
            Factory.handler.swiftKey()
          )
      ),
    hotkey: (): IHotkeyHandler =>
      Factory._getInstance(
        'hotkeyHandler',
        () =>
          new HotkeyHandler(
            Factory.util.key(),
            Factory.handler.keyConfig(),
            Factory.handler.modifierKeyConfig(),
            Factory.manager.tv(),
            Factory.handler.command()
          )
      ),
    kite: (): IKiteHandler =>
      Factory._getInstance(
        'kiteHandler',
        () =>
          new KiteHandler(
            Factory.manager.kite(),
            Factory.manager.symbol(),
            Factory.util.wait(),
            Factory.manager.ticker(),
            Factory.manager.tv(),
            Factory.util.ui()
          )
      ),
    ticker: (): ITickerHandler =>
      Factory._getInstance(
        'tickerHandler',
        () =>
          new TickerHandler(
            Factory.manager.recent(),
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.manager.screener()
          )
      ),

    tickerChange: (): ITickerChangeHandler =>
      Factory._getInstance(
        'tickerChangeHandler',
        () =>
          new TickerChangeHandler(
            Factory.manager.ticker(),
            Factory.handler.alert(),
            Factory.manager.header(),
            Factory.manager.recent(),
            Factory.handler.sequence(),
            Factory.handler.kite(),
            Factory.util.sync()
          )
      ),

    keyConfig: (): KeyConfig =>
      Factory._getInstance(
        'keyConfig',
        () =>
          new KeyConfig(
            Factory.manager.sequence(),
            Factory.manager.timeFrame(),
            Factory.handler.watchlist(),
            Factory.handler.flag(),
            Factory.manager.style(),
            Factory.handler.journal(),
            Factory.handler.kite()
          )
      ),
    modifierKeyConfig: (): IModifierKeyConfig =>
      Factory._getInstance(
        'modifierKeyConfig',
        () =>
          new ModifierKeyConfig(
            Factory.manager.ticker(),
            Factory.manager.style(),
            Factory.handler.alert(),
            Factory.handler.watchlist(),
            Factory.handler.flag()
          )
      ),
    watchlist: (): IWatchListHandler =>
      Factory._getInstance(
        'watchlistHandler',
        () =>
          new WatchListHandler(
            Factory.manager.watchlist(),
            Factory.manager.screener(),
            Factory.manager.header(),
            Factory.util.sync(),
            Factory.manager.watch(),
            Factory.manager.ticker()
          )
      ),
    pair: (): IPairHandler =>
      Factory._getInstance(
        'pairHandler',
        () => new PairHandler(Factory.client.investing(), Factory.manager.pair(), Factory.util.smart())
      ),
    flag: (): IFlagHandler =>
      Factory._getInstance(
        'flagHandler',
        () => new FlagHandler(Factory.manager.flag(), Factory.manager.ticker(), Factory.handler.watchlist())
      ),
    sequence: (): ISequenceHandler =>
      Factory._getInstance(
        'sequenceHandler',
        () => new SequenceHandler(Factory.manager.sequence(), Factory.manager.ticker())
      ),
    journal: (): IJournalHandler =>
      Factory._getInstance(
        'journalHandler',
        () =>
          new JournalHandler(
            Factory.manager.ticker() as TickerManager,
            Factory.manager.journal(),
            Factory.util.smart(),
            Factory.util.ui(),
            Factory.manager.tv(),
            Factory.manager.style()
          )
      ),
    swiftKey: (): ISwiftKeyHandler =>
      Factory._getInstance('swiftKeyHandler', () => new SwiftKeyHandler(Factory.manager.tv())),
    command: (): ICommandInputHandler =>
      Factory._getInstance(
        'commandHandler',
        () => new CommandInputHandler(Factory.handler.ticker(), Factory.handler.alert(), Factory.manager.fno())
      ),
    alertFeed: (): IAlertFeedHandler =>
      Factory._getInstance(
        'alertFeedHandler',
        () =>
          new AlertFeedHandler(
            Factory.util.ui(),
            Factory.util.sync(),
            Factory.manager.watch(),
            Factory.manager.symbol(),
            Factory.manager.recent(),
            Factory.manager.alert()
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
