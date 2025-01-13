import '../style/main.less';
import { Factory } from './factory';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { ISequenceHandler } from '../handler/sequence';
import { IOnLoadHandler } from '../handler/onload';
import { IAlertHandler } from '../handler/alert';
import { IAuditHandler } from '../handler/audit';
import { IJournalHandler } from '../handler/journal';
import { ICommandInputHandler } from '../handler/command';
import { Trend } from '../models/trading';

export class Barkat {
  // eslint-disable-next-line max-params
  constructor(
    private readonly uiUtil: UIUtil,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly onloadHandler: IOnLoadHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly auditHandler: IAuditHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly commandHandler: ICommandInputHandler
  ) {}

  initialize(): void {
    console.log('barkat initialized');
    // FIXME: #B Split UI Setup for Trading View vs Investing.
    this.setupUI();
    this.onLoad();
  }

  // HACK: Remove suppressed Errors for eslint
  // eslint-disable-next-line max-lines-per-function
  setupUI() {
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
          this.auditHandler.handleJournalButton();
        })
      )
      .append(
        this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.RECENT, false).change(() => {
          // FIXME: Change to Button ?
          console.log('Handling recent ticker reset');
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
