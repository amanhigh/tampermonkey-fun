import '../style/main.less';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { ITickerHandler } from '../handler/ticker';
import { IOnLoadHandler } from '../handler/onload';
import { IAlertHandler } from '../handler/alert';
import { IJournalHandler } from '../handler/journal';
import { ICommandInputHandler } from '../handler/command';
import { IKiteHandler } from '../handler/kite';
import { IAlertFeedHandler } from '../handler/alertfeed';
import { JournalActionType } from '../models/journal';
import { IGlobalErrorHandler } from '../handler/error';
import { IPanelHandler } from '../handler/panel';
import { IDomManager } from '../manager/dom';
import { ITradingViewManager } from '../manager/tv';
import { Factory } from './factory';

export class Barkat {
  constructor(
    private readonly errorHandler: IGlobalErrorHandler,
    private readonly uiUtil: UIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly onloadHandler: IOnLoadHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly commandHandler: ICommandInputHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly alertFeedHandler: IAlertFeedHandler,
    private readonly panelHandler: IPanelHandler,
    private readonly domManager: IDomManager,
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

  private setupInvestingUI(): void {
    this.alertFeedHandler.initialize();
    console.info('Investing UI setup');
  }

  private setupKiteUI(): void {
    this.kiteHandler.setUpListners();
    console.info('Kite UI setup');
  }

  private setupLocalhost(): void {
    console.info('Barkat localhost detected');
    this.journalHandler.registerJournalReviewHandler();
    this.journalHandler.registerOpenJournalHandler();
  }

  initialize(): void {
    console.info('Initializing Barkat');
    this.errorHandler.registerGlobalErrorHandlers();
    if (this.isLocalhostSite()) {
      this.setupLocalhost();
    } else if (this.isInvestingSite()) {
      this.setupInvestingUI();
    } else if (this.isTradingViewSite()) {
      this.setupTradingViewUI();
    } else if (this.isKiteSite()) {
      this.setupKiteUI();
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private setupTradingViewUI() {
    const $area = this.uiUtil.buildArea(
      Constants.UI.IDS.AREAS.MAIN,
      Constants.UI.POSITIONS.MAIN_LEFT,
      Constants.UI.POSITIONS.MAIN_TOP
    );
    $area.appendTo('body');

    // TODO: Move UI Build Logic to Handlers
    // FIXME: Explore Alpine.js for declarative area visibility/event binding to
    //        reduce jQuery chain boilerplate and improve Area lifecycle control.
    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.TOP, Constants.UI.POSITIONS.WRAPPER_WIDTH)
      .appendTo($area)
      .append(
        this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.SWIFT, false).change(() => {
          console.info('Enabling swift key');
        })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.SEQUENCE, 'S', () => {
            void this.tickerHandler.startTracking();
          })
          .on('contextmenu', (e) => {
            e.preventDefault();
            void this.tickerHandler.stopTracking(this.domManager.getTicker());
          })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.ALERT_CREATE, 'A')
          .on('click', (e) => this.alertHandler.handleAlertButton(e.originalEvent as MouseEvent))
          .on('contextmenu', (e) => {
            this.alertHandler.handleAlertContextMenu(e.originalEvent as MouseEvent);
          })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.REFRESH, 'R', () => this.alertHandler.handleRefreshButton())
          .on('contextmenu', (e) => {
            e.preventDefault();
            void this.panelHandler.showPanel();
          })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
            this.journalHandler.handleJournalButton();
          })
          .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
            e.preventDefault();
            const auditAreaId = `#${Constants.UI.IDS.AREAS.AUDIT}`;

            // Toggle audit area visibility (audit data loaded via FIRST_LOAD event)
            this.uiUtil.toggleUI(auditAreaId);
          })
      )
      .append(this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.SUMMARY));

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.MID, Constants.UI.POSITIONS.WRAPPER_WIDTH)
      .appendTo($area)
      .append(this.uiUtil.buildWrapper(Constants.UI.IDS.DISPLAY.CARD).addClass(Constants.UI.IDS.DISPLAY.CARD_CLASS))
      .append(this.uiUtil.buildWrapper(Constants.UI.IDS.TIMEFRAME_BAR.CONTAINER))
      .append(
        this.uiUtil.buildInput(Constants.UI.IDS.INPUTS.COMMAND).on('keydown', (e) => {
          void this.commandHandler.handleInput(e);
        })
      );

    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.ALERTS, Constants.UI.POSITIONS.WRAPPER_WIDTH).appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.ORDERS, Constants.UI.POSITIONS.WRAPPER_WIDTH).appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.JOURNAL).hide().appendTo($area);
    // BUG 3.1: Toolbar lives inside journal wrapper so it disappears when journal collapses; move toolbar outside for persistent access
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.AUDIT).hide().appendTo($area);
    this.journalUI();
    this.kiteHandler.setupGttRefreshListener();
    this.tvManager.startAutoSave();
    this.onloadHandler.init();
    console.info('TradingView UI setup');
  }

  journalUI() {
    // BUG 3.2: Journal toolbar is bespoke; combine with journal left-click toolbar and build via shared util with short emoji labels to save space
    this.uiUtil
      .buildWrapper(`${Constants.UI.IDS.AREAS.JOURNAL}-type`)
      .appendTo(`#${Constants.UI.IDS.AREAS.JOURNAL}`)
      .append(
        this.uiUtil.buildButton('trend', 'RJ', () => {
          void this.journalHandler.handleRecordJournal(JournalActionType.REJECTED);
        })
      )
      .append(
        this.uiUtil.buildButton('trend', 'RS', () => {
          void this.journalHandler.handleRecordJournal(JournalActionType.RESULT);
        })
      )
      .append(
        this.uiUtil.buildButton('trend', 'ST', () => {
          void this.journalHandler.handleRecordJournal(JournalActionType.SET);
        })
      );
  }
}

export function RunBarkat(): void {
  console.info('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

// RunBarkat();
