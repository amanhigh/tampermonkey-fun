/* eslint-disable max-lines */
import { InvestingClient, IInvestingClient } from '../client/investing';
import { IImdbHandler, ImdbHandler } from '../handler/imdb';
import { KiteClient, IKiteClient } from '../client/kite';
import { JournalClient, IJournalClient } from '../client/journal';
import { OsClient, IOsClient } from '../client/os';
import { TickerClient, ITickerClient } from '../client/ticker';
import { AlertTickerClient, IAlertTickerClient } from '../client/alert_ticker';
import { IPriceAlertClient, PriceAlertClient } from '../client/price_alert';
import { IAuditClient, AuditClient } from '../client/audit';
import { InstrumentClient, IInstrumentClient } from '../client/instrument';
import { UIUtil, IUIUtil } from '../util/ui';
import { ObserveUtil, IObserveUtil } from '../util/observer';
import { SearchUtil, ISearchUtil } from '../util/search';
import { SyncUtil, ISyncUtil } from '../util/sync';
import { KeyUtil, IKeyUtil } from '../util/key';
import { SmartPrompt, ISmartPrompt } from '../util/smart';
import { WaitUtil, IWaitUtil } from '../util/wait';
import { ExperimentApp } from './experiment';
import { ImdbApp } from './imdb';
import { Barkat } from './barkat';

// Repository Imports

// Manager Layer Imports
import { ITimeFrameManager, TimeFrameManager } from '../manager/timeframe';
import { IJournalManager, JournalManager } from '../manager/journal';
import { IAlertManager, AlertManager } from '../manager/alert';
import { ITradingViewWatchlistManager, TradingViewWatchlistManager } from '../manager/watchlist';
import { ISequenceManager, SequenceManager } from '../manager/sequence';
import { IPaintManager, PaintManager } from '../manager/paint';
import { IDomManager, DomManager } from '../manager/dom';
import { ITickerManager, TickerManager } from '../manager/ticker';
import { ILifecycleManager, LifecycleManager } from '../manager/lifecycle';
import { ITradingViewManager, TradingViewManager } from '../manager/tv';
import { IAlertTickerManager, AlertTickerManager } from '../manager/alert_ticker';
import { IInvestingManager, InvestingManager } from '../manager/investing';

// Handler Imports
import { AlertHandler } from '../handler/alert';
import { AlertSummaryHandler, IAlertSummaryHandler } from '../handler/alert_summary';
import { AuditHandler, IAuditHandler } from '../handler/audit';
import { JournalHandler, IJournalHandler } from '../handler/journal';
import { HotkeyHandler, IHotkeyHandler } from '../handler/hotkey';
import { KeyConfig } from '../handler/key_config';
import { IModifierKeyConfig, ModifierKeyConfig } from '../handler/modifier_config';

import { ISequenceHandler, SequenceHandler } from '../handler/sequence';
import { IKiteHandler, KiteHandler } from '../handler/kite';
import { IKiteManager, KiteManager } from '../manager/kite';
import { IStyleManager, StyleManager } from '../manager/style';
import { ICategoryManager, CategoryManager } from '../manager/category';
import { IRecentManager, RecentManager } from '../manager/recent';
import { IWatchListHandler, WatchListHandler } from '../handler/watchlist';
import { IOnLoadHandler, OnLoadHandler } from '../handler/onload';
import { IFlagHandler, FlagHandler } from '../handler/flag';
import { IKiteRepo, KiteRepo } from '../repo/kite';
import { IAlertTickerHandler, AlertTickerHandler } from '../handler/alert_ticker';
import { ITickerHandler, TickerHandler } from '../handler/ticker';
import { ITickerChangeHandler, TickerChangeHandler } from '../handler/ticker_change';

import { ICommandInputHandler, CommandInputHandler } from '../handler/command';
import { AlertFeedHandler, IAlertFeedHandler } from '../handler/alertfeed';
import { IGlobalErrorHandler, GlobalErrorHandler } from '../handler/error';
import { IAlertFeedManager, AlertFeedManager } from '../manager/alertfeed';
import { IImdbRepo, ImdbRepo } from '../repo/imdb';
import { IImdbManager as IImdbManager, ImdbManager } from '../manager/imdb';
import { IPanelHandler, PanelHandler } from '../handler/panel';
import { IPicassoHandler, PicassoHandler } from '../handler/picasso';
import { PicassoApp } from './picasso';
import { AuditSectionRegistry } from '../util/audit_registry';
import { AlertsPlugin } from '../manager/alerts_plugin';
import { GttPlugin } from '../manager/gtt_plugin';

import { TradeRiskPlugin } from '../manager/trade_risk_plugin';
import { AlertsAuditSection } from '../handler/alerts_section';
import { GttAuditSection } from '../handler/gtt_section';

import { TradeRiskSection } from '../handler/trade_risk_section';
import { StaleReviewPlugin } from '../manager/stale_review_plugin';
import { StaleReviewSection } from '../handler/stale_review_section';

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
  private static instances: Record<string, unknown> = {};

  /**
   * Application Layer
   * Core application functionality
   */
  public static app = {
    test: (): ExperimentApp =>
      Factory.getInstance('testApp', () => new ExperimentApp(Factory.util.ui(), Factory.util.key())),
    barkat: (): Barkat =>
      Factory.getInstance(
        'barkat',
        () =>
          new Barkat(
            Factory.handler.global(),
            Factory.util.ui(),
            Factory.handler.sequence(),
            Factory.handler.onload(),
            Factory.handler.alert(),
            Factory.handler.journal(),
            Factory.handler.command(),
            Factory.handler.kite(),
            Factory.handler.alertFeed(),
            Factory.handler.panel(),
            Factory.manager.tv(),
            Factory.handler.audit()
          )
      ),

    imdb: (): ImdbApp =>
      Factory.getInstance(
        'imdbApp',
        () => new ImdbApp(Factory.handler.imdb(), Factory.manager.imdb(), Factory.handler.global())
      ),
    picasso: (): PicassoApp =>
      Factory.getInstance('picassoApp', () => new PicassoApp(Factory.handler.global(), Factory.handler.picasso())),
  };

  /**
   * Client Layer
   * Handles external API interactions
   */
  public static client = {
    investing: (): IInvestingClient => Factory.getInstance('investingClient', () => new InvestingClient()),
    kite: (): IKiteClient => Factory.getInstance('kiteClient', () => new KiteClient()),
    journal: (): IJournalClient => Factory.getInstance('journalClient', () => new JournalClient()),
    os: (): IOsClient => Factory.getInstance('osClient', () => new OsClient()),
    ticker: (): ITickerClient => Factory.getInstance('tickerClient', () => new TickerClient()),
    tickerAlert: (): IAlertTickerClient => Factory.getInstance('tickerAlertClient', () => new AlertTickerClient()),
    priceAlert: (): IPriceAlertClient => Factory.getInstance('priceAlertClient', () => new PriceAlertClient()),
    audit: (): IAuditClient => Factory.getInstance('auditClient', () => new AuditClient()),
    instrument: (): IInstrumentClient => Factory.getInstance('instrumentClient', () => new InstrumentClient()),
  };

  /**
   * Utility Layer
   * Handles utility operations and management
   */
  public static util = {
    wait: (): IWaitUtil => Factory.getInstance('waitUtil', () => new WaitUtil()),
    observer: (): IObserveUtil => Factory.getInstance('observeUtil', () => new ObserveUtil()),
    search: (): ISearchUtil => Factory.getInstance('searchUtil', () => new SearchUtil()),
    sync: (): ISyncUtil => Factory.getInstance('syncUtil', () => new SyncUtil()),
    key: (): IKeyUtil => Factory.getInstance('keyUtil', () => new KeyUtil(Factory.util.sync())),
    smart: (): ISmartPrompt => Factory.getInstance('smartPrompt', () => new SmartPrompt()),
    ui: (): IUIUtil => Factory.getInstance('uiUtil', () => new UIUtil()),
  };

  /**
   * Repository Layer
   * Handles data persistence for various entities
   */
  public static repo = {
    kite: (): IKiteRepo => Factory.getInstance('kiteRepo', () => new KiteRepo()),
    imdb: (): IImdbRepo => Factory.getInstance('imdbRepo', () => new ImdbRepo()),
  };

  /**
   * Manager Layer
   * Handles business logic and orchestration
   */
  public static manager = {
    timeFrame: (): ITimeFrameManager =>
      Factory.getInstance('timeframeManager', () => new TimeFrameManager(Factory.manager.sequence())),

    alert: (): IAlertManager =>
      Factory.getInstance(
        'alertManager',
        () =>
          new AlertManager(
            Factory.client.priceAlert(),
            Factory.manager.alertTicker(),
            Factory.manager.dom(),
            Factory.client.investing(),
            Factory.manager.tv()
          )
      ),

    imdb: (): IImdbManager => Factory.getInstance('imdbManager', () => new ImdbManager(Factory.repo.imdb())),

    watchlist: (): ITradingViewWatchlistManager =>
      Factory.getInstance(
        'watchlistManager',
        () => new TradingViewWatchlistManager(Factory.manager.paint(), Factory.util.ui())
      ),

    category: (): ICategoryManager =>
      Factory.getInstance(
        'categoryManager',
        () => new CategoryManager(Factory.manager.ticker(), () => Factory.manager.journal())
      ),

    sequence: (): ISequenceManager =>
      Factory.getInstance('sequenceManager', () => new SequenceManager(Factory.client.ticker(), Factory.manager.dom())),

    paint: (): IPaintManager =>
      Factory.getInstance(
        'paintManager',
        () => new PaintManager(Factory.manager.dom(), Factory.manager.category(), Factory.manager.recent())
      ),

    dom: (): IDomManager =>
      Factory.getInstance(
        'domManager',
        () => new DomManager(Factory.util.wait(), Factory.manager.ticker(), Factory.manager.alertTicker())
      ),

    kite: (): IKiteManager =>
      Factory.getInstance('kiteManager', () => new KiteManager(Factory.client.kite(), Factory.repo.kite())),

    ticker: (): ITickerManager =>
      Factory.getInstance('tickerManager', () => new TickerManager(Factory.client.ticker())),

    lifecycle: (): ILifecycleManager =>
      Factory.getInstance(
        'lifecycleManager',
        () => new LifecycleManager(Factory.client.ticker(), Factory.manager.category(), Factory.manager.paint())
      ),

    tv: (): ITradingViewManager =>
      Factory.getInstance('tvManager', () => new TradingViewManager(Factory.util.wait(), Factory.client.os())),

    alertTicker: (): IAlertTickerManager =>
      Factory.getInstance('alertTickerManager', () => new AlertTickerManager(Factory.client.tickerAlert())),

    investing: (): IInvestingManager =>
      Factory.getInstance('investingManager', () => new InvestingManager(Factory.client.instrument())),

    style: (): IStyleManager =>
      Factory.getInstance('styleManager', () => new StyleManager(Factory.util.wait(), Factory.manager.timeFrame())),

    recent: (): IRecentManager =>
      Factory.getInstance('recentManager', () => new RecentManager(Factory.client.ticker())),
    journal: (): IJournalManager =>
      Factory.getInstance(
        'journalManager',
        () =>
          new JournalManager(
            Factory.manager.sequence(),
            Factory.client.journal(),
            Factory.client.os(),
            Factory.manager.timeFrame()
          )
      ),
    alertFeed: (): IAlertFeedManager =>
      Factory.getInstance(
        'alertFeedManager',
        () => new AlertFeedManager(Factory.manager.alertTicker(), Factory.manager.category(), Factory.manager.recent())
      ),
  };

  /**
   * Audit Layer
   * Each plugin is exposed as a separate field
   * Each section is created and registered in the registry
   * Registry is constructed at the end
   *
   * Architecture:
   * - Plugins are created first (business logic)
   * - Sections are created next (receive plugins via injection)
   * - Registry stores sections (primary) and plugins (temporary)
   */
  public static audit = {
    // ===== PLUGIN CREATION =====
    // Return a singleton AlertsPlugin instance (backend adapter via IAuditClient)
    alerts: () => Factory.getInstance('auditPlugin_alerts', () => new AlertsPlugin(Factory.client.audit())),

    // Return a singleton GttPlugin instance
    gttUnwatched: () =>
      Factory.getInstance(
        'auditPlugin_gttUnwatched',
        () => new GttPlugin(Factory.repo.kite(), Factory.manager.category())
      ),

    // OrphanFlagsPlugin and TickerCollisionPlugin retired per PRD audit.md §4.2.2

    // Return a singleton TradeRiskPlugin instance
    tradeRisk: () => Factory.getInstance('auditPlugin_tradeRisk', () => new TradeRiskPlugin(Factory.repo.kite())),

    // Return a singleton StaleReviewPlugin instance (backend adapter via IAuditClient)
    staleReview: () =>
      Factory.getInstance('auditPlugin_staleReview', () => new StaleReviewPlugin(Factory.client.audit())),

    // ===== SECTION CREATION =====
    // Alerts Audit Section - receives plugin via direct injection
    alertsSection: () =>
      Factory.getInstance(
        'alertsSection',
        () => new AlertsAuditSection(Factory.audit.alerts(), Factory.handler.ticker())
      ),

    // GTT Audit Section - receives plugin via direct injection
    // Pilot pattern: Follow this structure for other sections
    gttSection: () =>
      Factory.getInstance(
        'gttSection',
        () =>
          new GttAuditSection(
            Factory.audit.gttUnwatched(), // ✅ Direct plugin injection
            Factory.handler.ticker(),
            Factory.manager.kite(), // ✅ KiteManager for GTT order deletion
            Factory.util.ui()
          )
      ),

    // Trade Risk Audit Section (FR-017)
    tradeRiskSection: () =>
      Factory.getInstance(
        'tradeRiskSection',
        () => new TradeRiskSection(Factory.audit.tradeRisk(), Factory.handler.ticker(), Factory.manager.kite())
      ),

    // Stale Review Audit Section (FR-016)
    staleReviewSection: () =>
      Factory.getInstance(
        'staleReviewSection',
        () => new StaleReviewSection(Factory.audit.staleReview(), Factory.handler.ticker())
      ),

    // ===== REGISTRY =====
    // Build registry by registering all sections
    // FIXME: Catalogue-based registration — fetch available audits from backend
    // GET /v1/api/audits instead of hardcoding each section here.
    registry: () =>
      Factory.getInstance('auditRegistry', () => {
        const reg = new AuditSectionRegistry();

        // Register all sections
        reg.registerSection(Factory.audit.alertsSection());
        reg.registerSection(Factory.audit.gttSection());
        reg.registerSection(Factory.audit.tradeRiskSection());
        reg.registerSection(Factory.audit.staleReviewSection());

        return reg;
      }),
  } as const;

  /**
   * Handler Layer
   * Handles specific operations and user interactions
   */
  public static handler = {
    global: (): IGlobalErrorHandler => Factory.getInstance('globalErrorHandler', () => new GlobalErrorHandler()),
    alert: (): AlertHandler =>
      Factory.getInstance(
        'alertHandler',
        () =>
          new AlertHandler(
            Factory.manager.alert(),
            Factory.manager.tv(),
            Factory.handler.audit(),
            Factory.manager.dom(),
            Factory.manager.ticker(),
            Factory.manager.alertTicker(),
            Factory.util.sync(),
            Factory.util.ui(),
            Factory.handler.alertSummary(),
            Factory.handler.ticker(),
            Factory.handler.alertTicker(),
            Factory.manager.alertFeed()
          )
      ),
    alertSummary: (): IAlertSummaryHandler =>
      Factory.getInstance(
        'alertSummaryHandler',
        () => new AlertSummaryHandler(Factory.manager.alert(), Factory.manager.tv(), Factory.util.ui())
      ),
    audit: (): IAuditHandler =>
      Factory.getInstance('auditHandler', () => {
        // Handler receives registry which now contains sections
        // Sections are registered in Factory.audit.registry()
        return new AuditHandler(
          Factory.audit.registry(),
          Factory.util.ui(),
          Factory.handler.ticker(),
          Factory.handler.alertTicker(),
          Factory.manager.dom()
        );
      }),
    onload: (): IOnLoadHandler =>
      Factory.getInstance(
        'onloadHandler',
        () =>
          new OnLoadHandler(
            Factory.util.wait(),
            Factory.util.observer(),
            Factory.handler.watchlist(),
            Factory.handler.hotkey(),
            Factory.handler.alert(),
            Factory.handler.tickerChange(),
            Factory.manager.paint()
          )
      ),
    hotkey: (): IHotkeyHandler =>
      Factory.getInstance(
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
      Factory.getInstance(
        'kiteHandler',
        () =>
          new KiteHandler(
            Factory.manager.kite(),
            Factory.util.wait(),
            Factory.manager.dom(),
            Factory.manager.tv(),
            Factory.util.ui()
          )
      ),
    ticker: (): ITickerHandler =>
      Factory.getInstance(
        'tickerHandler',
        () =>
          new TickerHandler(
            Factory.manager.dom(),
            Factory.manager.style(),
            Factory.manager.ticker(),
            Factory.manager.lifecycle(),
            Factory.handler.alertTicker()
          )
      ),
    alertTicker: (): IAlertTickerHandler =>
      Factory.getInstance(
        'alertTickerHandler',
        () =>
          new AlertTickerHandler(
            Factory.client.investing(),
            Factory.manager.alertTicker(),
            Factory.util.smart(),
            Factory.manager.dom()
          )
      ),

    tickerChange: (): ITickerChangeHandler =>
      Factory.getInstance(
        'tickerChangeHandler',
        () =>
          new TickerChangeHandler(
            Factory.manager.dom(),
            Factory.handler.alert(),
            Factory.manager.paint(),
            Factory.manager.recent(),
            Factory.handler.sequence(),
            Factory.handler.kite(),
            Factory.util.sync(),
            Factory.manager.category(),
            Factory.manager.alertFeed()
          )
      ),

    keyConfig: (): KeyConfig =>
      Factory.getInstance(
        'keyConfig',
        () =>
          new KeyConfig(
            Factory.manager.timeFrame(),
            Factory.handler.watchlist(),
            Factory.handler.flag(),
            Factory.manager.style(),
            Factory.handler.journal(),
            Factory.handler.kite()
          )
      ),
    modifierKeyConfig: (): IModifierKeyConfig =>
      Factory.getInstance(
        'modifierKeyConfig',
        () => new ModifierKeyConfig(Factory.manager.dom(), Factory.manager.style(), Factory.handler.alert())
      ),
    watchlist: (): IWatchListHandler =>
      Factory.getInstance(
        'watchlistHandler',
        () =>
          new WatchListHandler(
            Factory.manager.watchlist(),
            Factory.manager.paint(),
            Factory.util.sync(),
            Factory.manager.category(),
            Factory.manager.dom(),
            Factory.manager.alertFeed()
          )
      ),
    flag: (): IFlagHandler =>
      Factory.getInstance(
        'flagHandler',
        () => new FlagHandler(Factory.manager.category(), Factory.manager.dom(), Factory.manager.paint())
      ),
    sequence: (): ISequenceHandler =>
      Factory.getInstance(
        'sequenceHandler',
        () =>
          new SequenceHandler(
            Factory.manager.sequence(),
            Factory.manager.dom(),
            Factory.manager.alertTicker(),
            Factory.manager.lifecycle()
          )
      ),
    journal: (): IJournalHandler =>
      Factory.getInstance(
        'journalHandler',
        () =>
          new JournalHandler(
            Factory.manager.dom() as DomManager,
            Factory.client.os(),
            Factory.manager.journal(),
            Factory.util.smart(),
            Factory.util.ui(),
            Factory.manager.tv(),
            Factory.manager.style(),
            Factory.manager.alert()
          )
      ),
    imdb: (): IImdbHandler =>
      Factory.getInstance('imdbHandler', () => new ImdbHandler(Factory.manager.imdb(), Factory.util.search())),

    command: (): ICommandInputHandler =>
      Factory.getInstance(
        'commandHandler',
        () => new CommandInputHandler(Factory.handler.ticker(), Factory.handler.alert())
      ),
    alertFeed: (): IAlertFeedHandler =>
      Factory.getInstance(
        'alertFeedHandler',
        () =>
          new AlertFeedHandler(
            Factory.util.ui(),
            Factory.util.sync(),
            Factory.manager.alert(),
            Factory.manager.alertFeed()
          )
      ),
    panel: (): IPanelHandler =>
      Factory.getInstance(
        'panelHandler',
        () => new PanelHandler(Factory.util.smart(), Factory.handler.ticker(), Factory.manager.dom())
      ),
    picasso: (): IPicassoHandler =>
      Factory.getInstance(
        'picassoHandler',
        () => new PicassoHandler(Factory.util.wait(), Factory.util.key(), Factory.util.smart())
      ),
  };

  /**
   * Creates or retrieves a singleton instance
   * @private
   * @param key - Instance identifier
   * @param creator - Factory function
   * @returns Instance of type T
   */
  private static getInstance<T>(key: string, creator: () => T): T {
    if (!this.instances[key]) {
      try {
        this.instances[key] = creator();
      } catch (error) {
        console.error(`Error creating instance for ${key}:`, error);
        throw error;
      }
    }
    return this.instances[key] as T;
  }
}
