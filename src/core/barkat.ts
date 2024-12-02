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

  setupUI() {
    this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN, '76%', '6%').appendTo('body');

    this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.TOP)
      .appendTo(`#${Constants.UI.IDS.AREAS.MAIN}`)
      .append(
        this.uiUtil.buildButton(Constants.UI.IDS.BUTTONS.SEQUENCE, 'S', () => {
          console.log('Sequence Switched');
        })
      );
  }
}

function main(): void {
  console.log('Barkat started');
  const barkat = Factory.app.barkat();
  barkat.initialize();
}

main();
