import { ISeerClient } from '../client/seer';
import { Constants } from '../models/shared/constant';
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

  /**
   * Find the one Xstream search result whose title or slug matches the media exactly.
   * @param root - Document holding the rendered Airtel Xstream search results
   * @param title - Media title displayed by Seer
   * @returns Detail url of the unique match, or undefined when nothing or several results match
   */
  findXstreamMatch(root: ParentNode, title: string): string | undefined;
}

/**
 * SearchManager maps a Seer detail route to the Airtel Xstream search of its title
 * and resolves the rendered Xstream result of that title.
 */
export class SearchManager implements ISearchManager {
  constructor(private readonly client: ISeerClient) {}

  /** @inheritdoc */
  async getXstreamUrl(pathname: string): Promise<string> {
    const title = await this.client.getSearchTitle(canonicalSeerDetailPath(pathname));
    return `${Constants.SEER.AIRTEL_BASE_URL}/search?q=${encodeURIComponent(title)}${Constants.SEER.AUTO_MARKER}`;
  }

  /** @inheritdoc */
  findXstreamMatch(root: ParentNode, title: string): string | undefined {
    const expected = normalizeLabel(title);
    if (!expected) {
      return undefined;
    }

    const destinations = new Set<string>();
    readResultAnchors(root).forEach((anchor) => {
      const destination = readMatch(anchor, expected);
      if (destination !== undefined) {
        destinations.add(destination);
      }
    });
    return destinations.size === 1 ? [...destinations][0] : undefined;
  }
}

/** Origin every opened Airtel Xstream url must keep. */
const AIRTEL_ORIGIN = new URL(Constants.SEER.AIRTEL_BASE_URL).origin;

/** Rendered grid result links inside the document of the Airtel Xstream search results. */
const GRID_LINK_SELECTOR = '#search-layout-container-searchResultV2 li.cs-grid-tile a.cs-grid-tile-button[href]';

/** Rendered hero result links inside the document of the Airtel Xstream search rail. */
const HERO_LINK_SELECTOR = '.cs-hero-banner-rail .hero-banner-wrapper a.hero-banner[href]';

/** Title node rendered inside a grid result link. */
const GRID_TITLE_SELECTOR = '.cs-grid-tile-title';

/** Title node rendered beside a hero result link. */
const HERO_TITLE_SELECTOR = '.hero-title';

/** Verified Airtel Xstream media detail paths, e.g. `/movies/avatar/HOTSTAR_DTH_MOVIE_3617`. */
const MEDIA_PATH_PATTERN = /^\/(?:movies|tv-shows)\/([^/]+)\/([^/]+)\/?$/;

/** Read the grid and hero result links rendered in the document of the search results. */
function readResultAnchors(root: ParentNode): Element[] {
  const grid = Array.from(root.querySelectorAll(GRID_LINK_SELECTOR));
  const hero = Array.from(root.querySelectorAll(HERO_LINK_SELECTOR));
  return [...grid, ...hero];
}

/**
 * Read the canonical detail url of one result link when its decoded slug or rendered title matches
 * the expected label, parsing the href once and rejecting untrusted origins as well as malformed encodings.
 */
function readMatch(anchor: Element, expected: string): string | undefined {
  const href = anchor.getAttribute('href');
  if (!href) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(href, Constants.SEER.AIRTEL_BASE_URL);
  } catch {
    return undefined;
  }

  // The Airtel origin is https, so the origin check also rejects every other scheme.
  const trusted = url.origin === AIRTEL_ORIGIN && !url.username && !url.password;
  if (!trusted) {
    return undefined;
  }

  let slug: string | undefined;
  try {
    slug = MEDIA_PATH_PATTERN.exec(decodeURIComponent(url.pathname))?.[1];
  } catch {
    slug = undefined;
  }
  if (slug === undefined) {
    return undefined;
  }

  const matched = normalizeLabel(slug) === expected || normalizeLabel(readLabel(anchor)) === expected;
  return matched ? `${url.origin}${url.pathname}` : undefined;
}

/** Read the rendered title of a result link, from its grid title, aria-label or hero title. */
function readLabel(anchor: Element): string {
  const candidates = [
    anchor.querySelector(GRID_TITLE_SELECTOR)?.textContent,
    anchor.getAttribute('aria-label'),
    anchor.parentElement?.querySelector(HERO_TITLE_SELECTOR)?.textContent,
  ];
  return candidates.find((candidate) => candidate && candidate.trim().length > 0) ?? '';
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
