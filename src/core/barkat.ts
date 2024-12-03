import '../style/main.less';
import { Factory } from './factory';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { ISequenceHandler } from '../handler/sequence';
import { IWatchListHandler } from '../handler/watchlist';

export class Barkat {
  constructor(
    private readonly uiUtil: UIUtil,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly watchListHandler: IWatchListHandler
  ) {}

  initialize(): void {
    console.log('barkat initialized');
    this.setupUI();
    this.onLoad();
  }

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
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.REFRESH, 'R', () => {
          this.onLoad();
        })
      )
      .append(
        this.uiUtil
          .buildButton(Constants.UI.IDS.BUTTONS.ALERT_CREATE, 'A', () => {
            console.log('Handling alert create button');
          })
          .contextmenu(() => {
            console.log('Context menu for alert create button');
            return false; // Disable default right-click menu
          })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
          console.log('Handling journal button');
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
      .append(this.uiUtil.buildInput(Constants.UI.IDS.INPUTS.COMMAND));

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
          console.log('Recording journal trend');
        })
      )
      .append(
        this.uiUtil.buildButton('ctrend', 'CT', () => {
          console.log('Recording journal counter-trend');
        })
      );

    this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.AUDIT).appendTo(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  onLoad() {
    console.log('Barkat Onload');
    // TODO: Create Onload Handler
    this.watchListHandler.onWatchListChange();
  }
}

function main(): void {
  console.log('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

main();
