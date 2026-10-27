import '../style/seer.less';
<<<<<<< HEAD
=======
import { IGlobalErrorHandler } from '../handler/error';
>>>>>>> master
import { ISearchHandler } from '../handler/search';
import { ISeerHandler } from '../handler/seer';
import { Constants } from '../models/constant';
import { Factory } from './factory';

/** Origin of the Seerr detail pages that carry the panel. */
const SEERR_ORIGIN = new URL(Constants.SEER.BASE_URL).origin;

/** Origin of the Airtel Xstream search pages that carry the automatic match. */
const AIRTEL_ORIGIN = new URL(Constants.SEER.AIRTEL_BASE_URL).origin;

export class SeerApp {
  constructor(
    private readonly seerHandler: ISeerHandler,
<<<<<<< HEAD
=======
    private readonly errorHandler: IGlobalErrorHandler,
>>>>>>> master
    private readonly searchHandler: ISearchHandler
  ) {}

  public initialize(): void {
<<<<<<< HEAD
=======
    // Register error handlers first
    this.errorHandler.registerGlobalErrorHandlers();

>>>>>>> master
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
