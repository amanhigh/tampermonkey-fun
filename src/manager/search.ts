import { ISeerClient } from '../client/seer';
import { Constants } from '../models/constant';
import { canonicalSeerDetailPath } from '../util/seer';

/**
 * ISearchManager resolves the Airtel Xstream search url of a Seer detail page.
 */
export interface ISearchManager {
  /**
   * Resolve the Airtel Xstream search url of the page.
   * @param pathname - Browser pathname of a Seer movie or tv detail page
   * @returns Promise resolving with the encoded Airtel Xstream search url
   */
  getXstreamUrl(pathname: string): Promise<string>;
}

/**
 * SearchManager maps a Seer detail route to the Airtel Xstream search of its title.
 */
export class SearchManager implements ISearchManager {
  constructor(private readonly client: ISeerClient) {}

  /** @inheritdoc */
  async getXstreamUrl(pathname: string): Promise<string> {
    const title = await this.client.getSearchTitle(canonicalSeerDetailPath(pathname));
    return `${Constants.SEER.AIRTEL_BASE_URL}/search?q=${encodeURIComponent(title)}`;
  }
}
