import { ISeerClient } from '../client/integrations/seer';
import {
  BINGE_CHANNEL_PREFERENCE,
  SEARCH_CONSTANTS,
  SEARCH_PROVIDERS,
  SearchMarker,
  SearchMatchConfig,
  SearchProvider,
  SearchProviderConfig,
} from '../models/integrations/search';
import { canonicalSeerDetailPath } from '../util/seer';

/**
 * ISearchManager resolves the provider search url of a Seer detail page and follows the
 * rendered provider result of its title.
 */
export interface ISearchManager {
  /**
   * Resolve the search url of one provider for the page.
   * @param provider - Provider whose search page is opened
   * @param pathname - Browser pathname of a Seer movie or tv detail page
   * @returns Promise resolving with the encoded marked provider search url
   */
  getUrl(provider: SearchProvider, pathname: string): Promise<string>;

  /**
   * Find the one provider search result whose title or slug matches the media exactly.
   *
   * A provider with a channel preference first keeps the matching results of its preferred
   * channel, and only falls back to every matching result when none carries that channel.
   * @param provider - Provider whose rendered search results are read
   * @param root - Document holding the rendered provider search results
   * @param title - Media title displayed by Seer
   * @returns Detail url of the unique match, or undefined when nothing or several results match
   */
  findMatch(provider: SearchProvider, root: ParentNode, title: string): string | undefined;
}

/**
 * SearchManager maps a Seer detail route to the provider search of its title
 * and resolves the rendered provider result of that title.
 */
export class SearchManager implements ISearchManager {
  constructor(private readonly client: ISeerClient) {}

  /** @inheritdoc */
  async getUrl(provider: SearchProvider, pathname: string): Promise<string> {
    const title = await this.client.getSearchTitle(canonicalSeerDetailPath(pathname));
    return buildSearchUrl(SEARCH_PROVIDERS[provider], title);
  }

  /** @inheritdoc */
  findMatch(provider: SearchProvider, root: ParentNode, title: string): string | undefined {
    const match = SEARCH_PROVIDERS[provider].match;
    if (match === undefined) {
      return undefined;
    }

    const expected = normalizeLabel(title);
    if (!expected) {
      return undefined;
    }

    return findUniqueDestination(readResultAnchors(root, match), expected, provider, match);
  }
}

/** Provider readers of the rendered title that labels one result link. */
const TITLE_READERS: Readonly<Partial<Record<SearchProvider, (anchor: Element) => string>>> = {
  [SearchProvider.XSTREAM]: readXstreamLabel,
  [SearchProvider.BINGE]: readBingeLabel,
};

/** Read the result links rendered in the document of one provider search page. */
function readResultAnchors(root: ParentNode, match: SearchMatchConfig): Element[] {
  return Array.from(root.querySelectorAll(match.resultSelector));
}

/**
 * Collect the defined destinations of the result links that match the expected label and return the
 * sole distinct one, so nothing or an ambiguous pair reports undefined. Binge matching results of its
 * preferred channel are kept unless none carries it, in which case every matching destination counts.
 * @param anchors - Rendered result links of one provider search page
 * @param expected - Normalized title the rendered results must match
 * @param provider - Provider whose readers resolve one link to its defined detail url
 * @param match - Match settings of the provider page whose rendered results Seer follows
 */
function findUniqueDestination(
  anchors: Element[],
  expected: string,
  provider: SearchProvider,
  match: SearchMatchConfig
): string | undefined {
  const destinations = new Set<string>();
  const preferred = new Set<string>();
  anchors.forEach((anchor) => {
    const destination = readMatch(anchor, expected, provider, match);
    if (destination === undefined) {
      return;
    }
    destinations.add(destination);
    if (provider === SearchProvider.BINGE && matchesBingeChannel(anchor)) {
      preferred.add(destination);
    }
  });

  const candidates = preferred.size > 0 ? preferred : destinations;
  return candidates.size === 1 ? [...candidates][0] : undefined;
}

/** Whether the channel logo of one Binge result link carries the preferred Chaupal channel label. */
function matchesBingeChannel(anchor: Element): boolean {
  const label = anchor.querySelector(BINGE_CHANNEL_PREFERENCE.selector)?.getAttribute('alt') ?? '';
  return label.trim().toLowerCase() === BINGE_CHANNEL_PREFERENCE.label.toLowerCase();
}

/**
 * Read the canonical detail url of one result link when its decoded slug or rendered title matches
 * the expected label, parsing the href once and rejecting untrusted origins as well as malformed
 * encodings.
 * @param anchor - Rendered result link of one provider search page
 * @param expected - Normalized title the rendered result must match
 * @param provider - Provider whose origin and title node drive the read
 * @param match - Match settings of the provider page whose rendered results Seer follows
 */
function readMatch(
  anchor: Element,
  expected: string,
  provider: SearchProvider,
  match: SearchMatchConfig
): string | undefined {
  const config = SEARCH_PROVIDERS[provider];
  // Every provider origin is https, so the origin check also rejects every other scheme.
  const url = readTrustedUrl(anchor, config.origin);
  const slug = url === undefined ? undefined : readDecodedSlug(url.pathname, match.detailPathPattern);
  if (url === undefined || slug === undefined) {
    return undefined;
  }

  const matched =
    normalizeLabel(slug) === expected || normalizeLabel(TITLE_READERS[provider]?.(anchor) ?? '') === expected;
  return matched ? `${url.origin}${canonicalDetailPath(url.pathname, match)}` : undefined;
}

/** Read the rendered title of an Airtel Xstream result link, from its grid title, aria-label or hero title. */
function readXstreamLabel(anchor: Element): string {
  const candidates = [
    anchor.querySelector(SEARCH_CONSTANTS.TITLE_SELECTORS.GRID)?.textContent,
    anchor.getAttribute('aria-label'),
    anchor.parentElement?.querySelector(SEARCH_CONSTANTS.TITLE_SELECTORS.HERO)?.textContent,
  ];
  return candidates.find((candidate) => candidate && candidate.trim().length > 0) ?? '';
}

/** Read the poster alt text that labels one Tata Play Binge result, ignoring provider logo alt text. */
function readBingeLabel(anchor: Element): string {
  return anchor.querySelector(SEARCH_CONSTANTS.TITLE_SELECTORS.BINGE)?.getAttribute('alt') ?? '';
}

/**
 * Build the search url of one provider, marked and armed for the automatic match when Seer follows
 * its rendered results and plain otherwise, keeping the title fully encoded.
 * @param config - Provider whose origin, search route, query key and marker build the url
 * @param title - Media title searched on the provider site
 */
function buildSearchUrl(config: SearchProviderConfig, title: string): string {
  const query = new URLSearchParams({ [config.queryKey]: `${title}${config.titleSuffix}` });
  const marker = config.match === undefined ? '' : markerSuffix(config.match.marker);
  return `${config.origin}${config.searchPath}?${query}${marker}`;
}

/**
 * Read the url suffix that carries the marker of one provider.
 * @param marker - Provider marker appended after the query
 */
function markerSuffix(marker: SearchMarker): string {
  return marker.kind === 'fragment' ? marker.value : `&${marker.name}=${marker.value}`;
}

/**
 * Read the detail path a provider reports, dropping the trailing slash when the provider allows it.
 * @param pathname - Verified detail pathname of one result link
 * @param match - Match settings of the provider page whose trailing slash rule drives the path
 */
function canonicalDetailPath(pathname: string, match: SearchMatchConfig): string {
  return match.stripTrailingSlash && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/** Read a trusted https url from a result link, rejecting untrusted origins, credentials and bad hrefs. */
function readTrustedUrl(anchor: Element, baseUrl: string): URL | undefined {
  const href = anchor.getAttribute('href');
  if (!href) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(href, baseUrl);
  } catch {
    return undefined;
  }

  return url.origin === baseUrl && !url.username && !url.password ? url : undefined;
}

/** Decode a pathname and read the slug captured by a detail route pattern, rejecting malformed encodings. */
function readDecodedSlug(pathname: string, pattern: RegExp): string | undefined {
  try {
    return pattern.exec(decodeURIComponent(pathname))?.[1];
  } catch {
    return undefined;
  }
}

/** Normalize a label for comparison: fold accents, unify `&`, drop punctuation and spacing. */
function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
