import '../style/main.less';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { BarId } from '../models/bar';
import { IOnLoadHandler } from '../handler/onload';
import { IJournalHandler } from '../handler/journal';
import { IJournalSyncHandler } from '../handler/journal_sync';
import { ICommandInputHandler } from '../handler/command';
import { IKiteHandler } from '../handler/kite';
import { IAlertFeedHandler } from '../handler/alertfeed';
import { IGlobalErrorHandler } from '../handler/error';
import { IDashboardSyncHandler } from '../handler/dashboard_sync';
import { ITradingViewManager } from '../manager/tv';
import { IToolbarHandler } from '../handler/toolbar';
import { Factory } from './factory';

export class Barkat {
  constructor(
    private readonly errorHandler: IGlobalErrorHandler,
    private readonly uiUtil: UIUtil,
    private readonly toolbarHandler: IToolbarHandler,
    private readonly onloadHandler: IOnLoadHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly journalSyncHandler: IJournalSyncHandler,
    private readonly commandHandler: ICommandInputHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly alertFeedHandler: IAlertFeedHandler,
    private readonly dashboardSyncHandler: IDashboardSyncHandler,
    private readonly tvManager: ITradingViewManager
  ) {}

  private isInvestingSite(): boolean {
    return window.location.host.includes('investing.com');
  }

  private isTradingViewSite(): boolean {
    return window.location.host.includes('tradingview.com');
  }

  private isKiteSite(): boolean {
    return window.location.host.includes('kite.zerodha.com');
  }

  private isLocalhostSite(): boolean {
    return window.location.host.includes('localhost');
  }

  private isDashyHost(): boolean {
    return window.location.port === '8050';
  }

  private setupInvestingUI(): void {
    this.alertFeedHandler.initialize();
    console.info('Investing UI setup');
  }

  private setupKiteUI(): void {
    this.kiteHandler.setUpListners();
    console.info('Kite UI setup');
  }

  private setupJournalHost(): void {
    console.info('Barkat localhost detected');
    this.journalSyncHandler.publishBarkatJournalOpen();
    this.journalSyncHandler.registerTvJournalRecordedListener();
  }

  private setupDashyHost(): void {
    console.info('Barkat dashy host detected');
    this.dashboardSyncHandler.registerDashyListner();
  }

  initialize(): void {
    console.info('Initializing Barkat');
    this.errorHandler.registerGlobalErrorHandlers();
    if (this.isLocalhostSite()) {
      if (this.isDashyHost()) {
        this.setupDashyHost();
      } else {
        this.setupJournalHost();
      }
    } else if (this.isInvestingSite()) {
      this.setupInvestingUI();
    } else if (this.isTradingViewSite()) {
      this.setupTradingViewUI();
    } else if (this.isKiteSite()) {
      this.setupKiteUI();
    }
  }

  private setupTradingViewUI() {
    const $area = this.uiUtil.buildArea(
      Constants.UI.IDS.AREAS.MAIN,
      Constants.UI.POSITIONS.MAIN_LEFT,
      Constants.UI.POSITIONS.MAIN_TOP
    );
    $area.appendTo('body');
    this.toolbarHandler.render();

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.MID, Constants.UI.POSITIONS.WRAPPER_WIDTH)
      .appendTo($area)
      .append(this.uiUtil.buildBar(BarId.WATCHLIST))
      .append(this.uiUtil.buildBar(BarId.ALERT))
      .append(this.uiUtil.buildBar(BarId.TIMEFRAME))
      .append(this.uiUtil.buildBar(BarId.ALERT_SUMMARY))
      .append(
        this.uiUtil.buildInput(Constants.UI.IDS.INPUTS.COMMAND).on('keydown', (e) => {
          void this.commandHandler.handleInput(e);
        })
      );
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.ORDERS, Constants.UI.POSITIONS.WRAPPER_WIDTH).appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.JOURNAL).hide().appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.AUDIT).hide().appendTo($area);
    this.journalHandler.renderToolbar();
    this.kiteHandler.setupGttRefreshListener();
    this.tvManager.startAutoSave();
    this.onloadHandler.init();
    console.info('TradingView UI setup');
  }
}

export function RunBarkat(): void {
  console.info('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

// RunBarkat();
