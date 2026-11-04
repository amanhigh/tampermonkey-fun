import '../style/seer.less';
import { ISearchHandler } from '../handler/search';
import { ISeerHandler } from '../handler/seer';
import { Constants } from '../models/constant';
import { SEARCH_PROVIDERS, SearchProvider } from '../models/search';
import { Factory } from './factory';

/** Origin of the Seerr detail pages that carry the panel. */
const SEERR_ORIGIN = new URL(Constants.SEER.BASE_URL).origin;

/** Provider search page selected by its exact origin, keyed through the provider data. */
const SEARCH_ORIGINS: ReadonlyMap<string, SearchProvider> = new Map(
  Object.values(SearchProvider).map((provider) => [SEARCH_PROVIDERS[provider].origin, provider])
);

export class SeerApp {
  constructor(
    private readonly seerHandler: ISeerHandler,
    private readonly searchHandler: ISearchHandler
  ) {}

  public initialize(): void {
    const origin = window.location.origin;
    if (origin === SEERR_ORIGIN) {
      this.seerHandler.initialize();
      return;
    }

    const provider = SEARCH_ORIGINS.get(origin);
    if (provider !== undefined) {
      this.searchHandler.search(provider);
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
