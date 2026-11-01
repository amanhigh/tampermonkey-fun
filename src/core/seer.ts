import '../style/seer.less';
import { ISearchHandler } from '../handler/search';
import { ISeerHandler } from '../handler/seer';
import { Constants } from '../models/shared/constant';
import { Factory } from './factory';

/** Origin of the Seerr detail pages that carry the panel. */
const SEERR_ORIGIN = new URL(Constants.SEER.BASE_URL).origin;

/** Origin of the Airtel Xstream search pages that carry the automatic match. */
const AIRTEL_ORIGIN = new URL(Constants.SEER.AIRTEL_BASE_URL).origin;

export class SeerApp {
  constructor(
    private readonly seerHandler: ISeerHandler,
    private readonly searchHandler: ISearchHandler
  ) {}

  public initialize(): void {
    const origin = window.location.origin;
    if (origin === SEERR_ORIGIN) {
      this.seerHandler.initialize();
    } else if (origin === AIRTEL_ORIGIN) {
      this.searchHandler.searchXstream();
    }
  }
}

export function RunSeer(): void {
  console.info('Seer started');
  const app = Factory.app.seer();
  app.initialize();
}

if (require.main?.id === module.id) {
  RunSeer();
}
