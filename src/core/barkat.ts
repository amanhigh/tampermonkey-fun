import '../style/main.less';
import { Factory } from './factory';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { ISequenceHandler } from '../handler/sequence';
import { IOnLoadHandler } from '../handler/onload';
import { IAlertHandler } from '../handler/alert';
import { IJournalHandler } from '../handler/journal';
import { ICommandInputHandler } from '../handler/command';
import { IKiteHandler } from '../handler/kite';
import { ITickerHandler } from '../handler/ticker';
import { Trend } from '../models/trading';

export class Barkat {
  // eslint-disable-next-line max-params
  constructor(
    private readonly uiUtil: UIUtil,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly onloadHandler: IOnLoadHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly commandHandler: ICommandInputHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly tickerHandler: ITickerHandler
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
    const $area = this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN);
    $area.appendTo('body');

    this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.HOOK, 'Hook', () => {
        console.log('Hook button clicked - Implementation pending');
      })
      .appendTo($area);
  }

  initialize(): void {
    console.log('barkat initialized');
    if (this.isInvestingSite()) {
      this.setupInvestingUI();
    } else if (this.isTradingViewSite()) {
      this.setupTradingViewUI();
    } else if (this.isKiteSite()) {
      this.kiteHandler.setUpListners();
    }
    this.onLoad();
  }

  // XXX: Remove suppressed Errors for eslint
  // eslint-disable-next-line max-lines-per-function
  private setupTradingViewUI() {
    const $area = this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN, '76%', '6%');
    $area.appendTo('body');

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.TOP)
      .appendTo($area)
      .append(
        this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.SWIFT, false).change(() => {
          console.log('Enabling swift key');
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
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.REFRESH, 'R', () => this.alertHandler.handleRefreshButton())
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
          this.journalHandler.handleJournalButton();
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.RECENT, 'T', () => {
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

    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.AUDIT).appendTo(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  onLoad() {
    console.log('Barkat Onload');
    this.onloadHandler.init();
  }
}

function main(): void {
  console.log('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

main();
