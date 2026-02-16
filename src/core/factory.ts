/* eslint-disable max-lines */
import { InvestingClient, IInvestingClient } from '../client/investing';
import { IImdbHandler, ImdbHandler } from '../handler/imdb';
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
import { ImdbApp } from './imdb';
import { Barkat } from './barkat';

// Repository Imports
import { RepoCron, IRepoCron } from '../repo/cron';
import { IFlagRepo, FlagRepo } from '../repo/flag';
import { IWatchlistRepo, Watchlistrepo } from '../repo/watch';
import { IPairRepo, PairRepo } from '../repo/pair';
import { IExchangeRepo, ExchangeRepo } from '../repo/exchange';
import { ITickerRepo, TickerRepo } from '../repo/ticker';
import { ISequenceRepo, SequenceRepo } from '../repo/sequence';
import { IRecentTickerRepo, RecentTickerRepo } from '../repo/recent';
import { IAlertRepo, AlertRepo } from '../repo/alert';

// Manager Layer Imports
import { ITimeFrameManager, TimeFrameManager } from '../manager/timeframe';
import { IJournalManager, JournalManager } from '../manager/journal';
import { IAlertManager, AlertManager } from '../manager/alert';
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
import { IntegrityPlugin } from '../manager/integrity_plugin';
import { OrphanAlertsPlugin } from '../manager/orphan_alerts_plugin';
import { OrphanSequencesPlugin } from '../manager/orphan_sequences_plugin';
import { OrphanFlagsPlugin } from '../manager/orphan_flags_plugin';
import { OrphanExchangePlugin } from '../manager/orphan_exchange_plugin';
import { DuplicatePairIdsPlugin } from '../manager/duplicate_pair_ids_plugin';
import { TradeRiskPlugin } from '../manager/trade_risk_plugin';
import { TickerCollisionPlugin } from '../manager/ticker_collision_plugin';
import { GttAuditSection } from '../handler/gtt_section';
import { AlertsAuditSection } from '../handler/alerts_section';
import { OrphanAlertsSection } from '../handler/orphan_alerts_section';
import { IntegritySection } from '../handler/integrity_section';
import { OrphanSequencesSection } from '../handler/orphan_sequences_section';
import { OrphanFlagsSection } from '../handler/orphan_flags_section';
import { OrphanExchangeSection } from '../handler/orphan_exchange_section';
import { DuplicatePairIdsSection } from '../handler/duplicate_pair_ids_section';
import { TickerCollisionSection } from '../handler/ticker_collision_section';
import { TradeRiskSection } from '../handler/trade_risk_section';
import { CanonicalRanker, ICanonicalRanker } from '../manager/canonical_ranker';
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
            Factory.handler.ticker(),
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
    kohan: (): IKohanClient => Factory.getInstance('kohanClient', () => new KohanClient()),
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
    cron: (): IRepoCron => Factory.getInstance('repoCron', () => new RepoCron()),

    flag: (): IFlagRepo => Factory.getInstance('flagRepo', () => new FlagRepo(Factory.repo.cron())),
    watch: (): IWatchlistRepo => Factory.getInstance('watchRepo', () => new Watchlistrepo(Factory.repo.cron())),
    alert: (): IAlertRepo => Factory.getInstance('alertRepo', () => new AlertRepo(Factory.repo.cron())),
    pair: (): IPairRepo => Factory.getInstance('pairRepo', () => new PairRepo(Factory.repo.cron())),
    exchange: (): IExchangeRepo => Factory.getInstance('exchangeRepo', () => new ExchangeRepo(Factory.repo.cron())),
    ticker: (): ITickerRepo => Factory.getInstance('tickerRepo', () => new TickerRepo(Factory.repo.cron())),
    sequence: (): ISequenceRepo => Factory.getInstance('sequenceRepo', () => new SequenceRepo(Factory.repo.cron())),
    fno: (): IFnoRepo => Factory.getInstance('fnoRepo', () => new FnoRepo(Factory.repo.cron())),
    kite: (): IKiteRepo => Factory.getInstance('kiteRepo', () => new KiteRepo()),
    recent: (): IRecentTickerRepo => Factory.getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo.cron())),
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
            Factory.repo.alert(),
            Factory.manager.pair(),
            Factory.manager.ticker(),
            Factory.client.investing(),
            Factory.manager.tv()
          )
      ),

    imdb: (): IImdbManager => Factory.getInstance('imdbManager', () => new ImdbManager(Factory.repo.imdb())),

    watchlist: (): ITradingViewWatchlistManager =>
      Factory.getInstance(
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
      Factory.getInstance(
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

    watch: (): IWatchManager => Factory.getInstance('watchManager', () => new WatchManager(Factory.repo.watch())),

    screener: (): ITradingViewScreenerManager =>
      Factory.getInstance(
        'screenerManager',
        () =>
          new TradingViewScreenerManager(
            Factory.manager.paint(),
            Factory.manager.watch(),
            Factory.manager.flag(),
            Factory.manager.recent()
          )
      ),

    sequence: (): ISequenceManager =>
      Factory.getInstance(
        'sequenceManager',
        () => new SequenceManager(Factory.repo.sequence(), Factory.manager.ticker())
      ),

    paint: (): IPaintManager => Factory.getInstance('paintManager', () => new PaintManager()),

    ticker: (): ITickerManager =>
      Factory.getInstance(
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
      Factory.getInstance(
        'kiteManager',
        () => new KiteManager(Factory.manager.symbol(), Factory.client.kite(), Factory.repo.kite())
      ),

    symbol: (): ISymbolManager =>
      Factory.getInstance('symbolManager', () => new SymbolManager(Factory.repo.ticker(), Factory.repo.exchange())),

    tv: (): ITradingViewManager =>
      Factory.getInstance(
        'tvManager',
        () => new TradingViewManager(Factory.util.wait(), Factory.repo.cron(), Factory.client.kohan())
      ),

    pair: (): IPairManager =>
      Factory.getInstance(
        'pairManager',
        () =>
          new PairManager(
            Factory.repo.pair(),
            Factory.manager.symbol(),
            Factory.manager.watch(),
            Factory.manager.flag(),
            Factory.manager.alertFeed(),
            Factory.repo.recent(),
            Factory.repo.sequence(),
            Factory.repo.exchange(),
            Factory.repo.alert(),
            Factory.client.investing()
          )
      ),

    style: (): IStyleManager =>
      Factory.getInstance('styleManager', () => new StyleManager(Factory.util.wait(), Factory.manager.timeFrame())),

    flag: (): IFlagManager =>
      Factory.getInstance('flagManager', () => new FlagManager(Factory.repo.flag(), Factory.manager.paint())),

    recent: (): IRecentManager =>
      Factory.getInstance('recentManager', () => new RecentManager(Factory.repo.recent(), Factory.manager.paint())),
    journal: (): IJournalManager =>
      Factory.getInstance(
        'journalManager',
        () => new JournalManager(Factory.manager.sequence(), Factory.client.kohan(), Factory.manager.timeFrame())
      ),
    fno: (): IFnoManager => Factory.getInstance('fnoManager', () => new FnoManager(Factory.repo.fno())),
    alertFeed: (): IAlertFeedManager =>
      Factory.getInstance(
        'alertFeedManager',
        () => new AlertFeedManager(Factory.manager.symbol(), Factory.manager.watch(), Factory.manager.recent())
      ),
    canonicalRanker: (): ICanonicalRanker =>
      Factory.getInstance(
        'canonicalRanker',
        () =>
          new CanonicalRanker({
            alertRepo: Factory.repo.alert(),
            watchManager: Factory.manager.watch(),
            recentRepo: Factory.repo.recent(),
            sequenceRepo: Factory.repo.sequence(),
            exchangeRepo: Factory.repo.exchange(),
            pairRepo: Factory.repo.pair(),
            symbolManager: Factory.manager.symbol(),
          })
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
    // Return a singleton AlertsAudit instance
    alerts: () =>
      Factory.getInstance(
        'auditPlugin_alerts',
        () =>
          new AlertsPlugin(
            Factory.manager.pair(),
            Factory.manager.alert(),
            Factory.manager.watch(),
            Factory.manager.symbol()
          )
      ),

    // Return a singleton IntegrityPlugin instance (FR-007)
    integrity: () =>
      Factory.getInstance(
        'auditPlugin_integrity',
        () => new IntegrityPlugin(Factory.repo.pair(), Factory.repo.ticker())
      ),

    // Return a singleton GttPlugin instance
    gttUnwatched: () =>
      Factory.getInstance(
        'auditPlugin_gttUnwatched',
        () => new GttPlugin(Factory.repo.kite(), Factory.manager.watch())
      ),

    // Return a singleton OrphanAlertsPlugin instance
    orphanAlerts: () =>
      Factory.getInstance(
        'auditPlugin_orphanAlerts',
        () => new OrphanAlertsPlugin(Factory.repo.alert(), Factory.repo.pair())
      ),

    // Return a singleton OrphanSequencesPlugin instance
    orphanSequences: () =>
      Factory.getInstance(
        'auditPlugin_orphanSequences',
        () => new OrphanSequencesPlugin(Factory.repo.sequence(), Factory.repo.ticker(), Factory.manager.symbol())
      ),

    // Return a singleton OrphanFlagsPlugin instance
    orphanFlags: () =>
      Factory.getInstance(
        'auditPlugin_orphanFlags',
        () => new OrphanFlagsPlugin(Factory.repo.flag(), Factory.repo.ticker(), Factory.manager.symbol())
      ),

    // Return a singleton OrphanExchangePlugin instance
    orphanExchange: () =>
      Factory.getInstance(
        'auditPlugin_orphanExchange',
        () => new OrphanExchangePlugin(Factory.repo.exchange(), Factory.repo.ticker())
      ),

    // Return a singleton DuplicatePairIdsPlugin instance
    duplicatePairIds: () =>
      Factory.getInstance('auditPlugin_duplicatePairIds', () => new DuplicatePairIdsPlugin(Factory.manager.pair())),

    // Return a singleton TickerCollisionPlugin instance
    tickerCollision: () =>
      Factory.getInstance('auditPlugin_tickerCollision', () => new TickerCollisionPlugin(Factory.repo.ticker())),

    // Return a singleton TradeRiskPlugin instance
    tradeRisk: () => Factory.getInstance('auditPlugin_tradeRisk', () => new TradeRiskPlugin(Factory.repo.kite())),

    // Return a singleton StaleReviewPlugin instance (FR-016)
    staleReview: () =>
      Factory.getInstance(
        'auditPlugin_staleReview',
        () => new StaleReviewPlugin(Factory.repo.recent(), Factory.repo.ticker(), Factory.manager.watch())
      ),

    // ===== SECTION CREATION =====
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

    // Alerts Audit Section - receives plugin via direct injection
    // Follows GTT pattern for consistency
    alertsSection: () =>
      Factory.getInstance(
        'alertsSection',
        () =>
          new AlertsAuditSection(
            Factory.audit.alerts(), // ✅ Direct plugin injection
            Factory.handler.ticker(),
            Factory.manager.symbol(),
            Factory.handler.pair() // ✅ PairHandler handles watchlist repaint
          )
      ),

    // Orphan Alerts Audit Section - receives plugin via direct injection
    // Follows GTT and Alerts patterns for consistency
    orphanAlertsSection: () =>
      Factory.getInstance(
        'orphanAlertsSection',
        () =>
          new OrphanAlertsSection(
            Factory.audit.orphanAlerts(), // ✅ Direct plugin injection
            Factory.handler.ticker(), // ✅ TickerHandler for opening tickers by name
            Factory.manager.alert(), // ✅ AlertManager for deletion operations
            Factory.util.ui()
          )
      ),

    // Integrity Audit Section (FR-007) - receives plugin via direct injection
    // Displays pairs without TradingView mappings for cleanup
    integritySection: () =>
      Factory.getInstance(
        'integritySection',
        () =>
          new IntegritySection(
            Factory.audit.integrity(), // ✅ Direct plugin injection
            Factory.handler.ticker(), // For opening tickers
            Factory.handler.pair() // ✅ PairHandler handles watchlist repaint
          )
      ),

    // Orphan Sequences Audit Section (FR-011)
    orphanSequencesSection: () =>
      Factory.getInstance(
        'orphanSequencesSection',
        () =>
          new OrphanSequencesSection(
            Factory.audit.orphanSequences(),
            Factory.handler.ticker(),
            Factory.manager.sequence()
          )
      ),

    // Orphan Flags Audit Section (FR-012)
    orphanFlagsSection: () =>
      Factory.getInstance(
        'orphanFlagsSection',
        () => new OrphanFlagsSection(Factory.audit.orphanFlags(), Factory.handler.ticker(), Factory.handler.pair())
      ),

    // Orphan Exchange Audit Section (FR-013)
    orphanExchangeSection: () =>
      Factory.getInstance(
        'orphanExchangeSection',
        () =>
          new OrphanExchangeSection(Factory.audit.orphanExchange(), Factory.handler.ticker(), Factory.manager.symbol())
      ),

    // Duplicate PairIds Audit Section (FR-014)
    duplicatePairIdsSection: () =>
      Factory.getInstance(
        'duplicatePairIdsSection',
        () =>
          new DuplicatePairIdsSection(
            Factory.audit.duplicatePairIds(),
            Factory.handler.ticker(),
            Factory.manager.symbol(),
            Factory.manager.canonicalRanker(),
            Factory.manager.pair()
          )
      ),

    // Ticker Collision Audit Section (FR-015)
    tickerCollisionSection: () =>
      Factory.getInstance(
        'tickerCollisionSection',
        () =>
          new TickerCollisionSection(
            Factory.audit.tickerCollision(),
            Factory.handler.ticker(),
            Factory.manager.symbol(),
            Factory.manager.canonicalRanker()
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
        () => new StaleReviewSection(Factory.audit.staleReview(), Factory.handler.ticker(), Factory.handler.pair())
      ),

    // ===== REGISTRY =====
    // Build registry by registering all sections
    registry: () =>
      Factory.getInstance('auditRegistry', () => {
        const reg = new AuditSectionRegistry();

        // Register all sections
        reg.registerSection(Factory.audit.alertsSection());
        reg.registerSection(Factory.audit.gttSection());
        reg.registerSection(Factory.audit.orphanAlertsSection());
        reg.registerSection(Factory.audit.integritySection());
        reg.registerSection(Factory.audit.orphanSequencesSection());
        reg.registerSection(Factory.audit.orphanFlagsSection());
        reg.registerSection(Factory.audit.orphanExchangeSection());
        reg.registerSection(Factory.audit.duplicatePairIdsSection());
        reg.registerSection(Factory.audit.tickerCollisionSection());
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
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.util.sync(),
            Factory.util.ui(),
            Factory.handler.alertSummary(),
            Factory.handler.ticker(),
            Factory.handler.pair(),
            Factory.manager.alertFeed(),
            Factory.handler.watchlist()
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
          Factory.handler.pair(),
          Factory.manager.ticker()
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
            Factory.manager.screener()
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
            Factory.manager.symbol(),
            Factory.util.wait(),
            Factory.manager.ticker(),
            Factory.manager.tv(),
            Factory.util.ui()
          )
      ),
    ticker: (): ITickerHandler =>
      Factory.getInstance(
        'tickerHandler',
        () =>
          new TickerHandler(
            Factory.manager.recent(),
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.manager.screener(),
            Factory.manager.alertFeed(),
            Factory.handler.pair()
          )
      ),

    tickerChange: (): ITickerChangeHandler =>
      Factory.getInstance(
        'tickerChangeHandler',
        () =>
          new TickerChangeHandler(
            Factory.manager.ticker(),
            Factory.handler.alert(),
            Factory.manager.header(),
            Factory.manager.recent(),
            Factory.handler.sequence(),
            Factory.handler.kite(),
            Factory.util.sync(),
            Factory.manager.watch(), // Add dependency
            Factory.manager.alertFeed(),
            Factory.manager.screener()
          )
      ),

    keyConfig: (): KeyConfig =>
      Factory.getInstance(
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
      Factory.getInstance(
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
      Factory.getInstance(
        'watchlistHandler',
        () =>
          new WatchListHandler(
            Factory.manager.watchlist(),
            Factory.manager.screener(),
            Factory.manager.header(),
            Factory.util.sync(),
            Factory.manager.watch(),
            Factory.manager.ticker(),
            Factory.manager.alertFeed(),
            Factory.util.ui()
          )
      ),
    pair: (): IPairHandler =>
      Factory.getInstance(
        'pairHandler',
        () =>
          new PairHandler(
            Factory.client.investing(),
            Factory.manager.pair(),
            Factory.util.smart(),
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.handler.watchlist(),
            Factory.manager.style()
          )
      ),
    flag: (): IFlagHandler =>
      Factory.getInstance(
        'flagHandler',
        () => new FlagHandler(Factory.manager.flag(), Factory.manager.ticker(), Factory.handler.watchlist())
      ),
    sequence: (): ISequenceHandler =>
      Factory.getInstance(
        'sequenceHandler',
        () =>
          new SequenceHandler(
            Factory.manager.sequence(),
            Factory.manager.ticker(),
            Factory.manager.symbol(),
            Factory.manager.pair()
          )
      ),
    journal: (): IJournalHandler =>
      Factory.getInstance(
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
    imdb: (): IImdbHandler =>
      Factory.getInstance('imdbHandler', () => new ImdbHandler(Factory.manager.imdb(), Factory.util.search())),

    command: (): ICommandInputHandler =>
      Factory.getInstance(
        'commandHandler',
        () => new CommandInputHandler(Factory.handler.ticker(), Factory.handler.alert(), Factory.manager.fno())
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
        () => new PanelHandler(Factory.util.smart(), Factory.handler.pair(), Factory.manager.ticker())
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
