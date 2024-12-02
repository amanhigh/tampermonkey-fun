import '../style/main.less';
import { Factory } from './factory';
import { UIUtil } from '../util/ui';
import { Constants } from '../models/constant';

export class Barkat {
  constructor(private readonly uiUtil: UIUtil) {}
  initialize(): void {
    console.log('barkat initialized');
    this.setupUI();
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
          console.log('Handling sequence switch');
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.REFRESH, 'R', () => {
          console.log('Handling refresh button');
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.ALERT_CREATE, 'A', () => {
          console.log('Handling alert create button');
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
          console.log('Handling journal button');
        })
      )
      .append(
        this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.RECENT, false).change(() => {
          console.log('Handling recent ticker reset');
        })
      )
      .append(this.uiUtil.buildWrapper(Constants.UI.IDS.AREAS.SUMMARY));

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.MID)
      .appendTo($area)
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.INPUTS.DISPLAY, '', () => {
          console.log('Handling display input');
        })
      )
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.INPUTS.COMMAND, '', () => {
          console.log('Handling command input');
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
}

function main(): void {
  console.log('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

main();
