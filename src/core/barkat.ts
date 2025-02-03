import '../style/main.less';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { ISequenceHandler } from '../handler/sequence';
import { IOnLoadHandler } from '../handler/onload';
import { IAlertHandler } from '../handler/alert';
import { IJournalHandler } from '../handler/journal';
import { ICommandInputHandler } from '../handler/command';
import { IKiteHandler } from '../handler/kite';
import { ITickerHandler } from '../handler/ticker';
import { IAlertFeedHandler } from '../handler/alertfeed';
import { Trend } from '../models/trading';
import { IGlobalErrorHandler } from '../handler/error';
import { IPanelHandler } from '../handler/panel';
import { ITradingViewManager } from '../manager/tv';
import { Factory } from './factory';

export class Barkat {
  // eslint-disable-next-line max-params
  constructor(
    private readonly errorHandler: IGlobalErrorHandler,
    private readonly uiUtil: UIUtil,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly onloadHandler: IOnLoadHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly commandHandler: ICommandInputHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly tickerHandler: ITickerHandler,
    private readonly alertFeedHandler: IAlertFeedHandler,
    private readonly panelHandler: IPanelHandler,
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

  private setupInvestingUI(): void {
    this.alertFeedHandler.initialize();
    console.info('Investing UI setup');
  }

  private setupKiteUI(): void {
    this.kiteHandler.setUpListners();
    console.info('Kite UI setup');
  }

  initialize(): void {
    this.errorHandler.registerGlobalErrorHandlers();
    if (this.isInvestingSite()) {
      this.setupInvestingUI();
    } else if (this.isTradingViewSite()) {
      this.setupTradingViewUI();
    } else if (this.isKiteSite()) {
      this.setupKiteUI();
    }
  }

  // TASK Remove suppressed Errors for eslint
  // eslint-disable-next-line max-lines-per-function
  private setupTradingViewUI() {
    // TODO: Layout and Color Improvements
    const $area = this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN, '76%', '6%');
    $area.appendTo('body');

    // TASK Move UI Build Logic to Handlers
    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.TOP)
      .appendTo($area)
      .append(
        this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.SWIFT, false).change(() => {
          console.info('Enabling swift key');
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.SEQUENCE, 'S', () => {
          this.sequenceHandler.handleSequenceSwitch();
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
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
          this.journalHandler.handleJournalButton();
        })
        .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
          e.preventDefault();
          this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.AUDIT}`);
        })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.RECENT, 'X', () => {
            this.tickerHandler.resetRecent();
          })
      )
      .append(this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.SUMMARY));

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.MID)
      .appendTo($area)
      .append(this.uiUtil.buildInput(Constants.UI.IDS.INPUTS.DISPLAY))
      .append(
        this.uiUtil.buildInput(Constants.UI.IDS.INPUTS.COMMAND).on('keydown', (e) => {
          void this.commandHandler.handleInput(e);
        })
      );

    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.ALERTS).appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.ORDERS).appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.JOURNAL).hide().appendTo($area);
    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.AUDIT).hide().appendTo($area);
    this.journalUI();
    this.kiteHandler.setupGttRefreshListener();
    this.tvManager.startAutoSave();
    this.onloadHandler.init();
    console.info('TradingView UI setup');
  }

  journalUI() {
    this.uiUtil
      .buildWrapper(`${Constants.UI.IDS.AREAS.JOURNAL}-type`)
      .appendTo(`#${Constants.UI.IDS.AREAS.JOURNAL}`)
      .append(
        this.uiUtil.buildButton('trend', 'TR', () => {
          this.journalHandler.handleRecordJournal(Trend.TREND);
        })
      )
      .append(
        this.uiUtil.buildButton('ctrend', 'CT', () => {
          this.journalHandler.handleRecordJournal(Trend.COUNTER_TREND);
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
