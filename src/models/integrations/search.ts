/**
 * Provider search data shared by the Seer core, search handler and search manager.
 *
 * This module is deliberately data only: it holds the origins, markers, selectors and
 * button settings of every provider, and owns no DOM, network or notification behaviour.
 */

import { Constants } from '../shared/constant';

/** Provider search sites Seer opens and follows. */
export enum SearchProvider {
  XSTREAM = 'xstream',
  BINGE = 'binge',
}

/**
 * Marker arming one provider search page for the automatic match: a fragment appended to the
 * url, or a query parameter the page keeps while reading its own search text.
 */
export type SearchMarker =
  | {
      /** Fragment form, appended verbatim after the query. */
      readonly kind: 'fragment';
      /** Fragment value carrying the marker, e.g. `#seer-auto`. */
      readonly value: string;
    }
  | {
      /** Query parameter form, appended after the query. */
      readonly kind: 'query';
      /** Query parameter name carrying the marker. */
      readonly name: string;
      /** Query parameter value carrying the marker. */
      readonly value: string;
    };

/** Seer panel button that opens one provider search. */
export interface SearchButtonConfig {
  /** Stable id of the mounted button and its own busy state. */
  readonly id: string;
  /** Plain provider name rendered as `▶️ <label>`, `Opening <label>…` and in the failure notice. */
  readonly label: string;
}

/** Settings that distinguish one provider search page from another. */
export interface SearchProviderConfig {
  /** Human readable provider name used by the notices. */
  readonly label: string;
  /** Origin the marked search page must keep. */
  readonly origin: string;
  /** Live search box whose edits cancel the pending match. */
  readonly inputId: string;
  /** Native CSS selector list of rendered result links; selecting one cancels the pending match. */
  readonly resultSelector: string;
  /** Marker arming the provider search page. */
  readonly marker: SearchMarker;
  /** Verified media detail path, capturing the decoded slug first. */
  readonly detailPathPattern: RegExp;
  /** Whether a resolved detail path drops its trailing slash. */
  readonly stripTrailingSlash: boolean;
  /** Seer panel button opening this provider search. */
  readonly button: SearchButtonConfig;
}

/** Shared timing, route and title constants of the provider search pages. */
export const SEARCH_CONSTANTS = Object.freeze({
  /** Pathname shared by every provider search page. */
  SEARCH_PATH: '/search',
  /** Query parameter carrying the searched title. */
  SEARCH_QUERY_KEY: 'q',
  /** Deadline after which the unmatched title reports the manual fallback once. */
  MATCH_TIMEOUT_MS: 15000,
  /** Display duration of a single notice or failure notification in milliseconds. */
  NOTICE_TIMEOUT_MS: 8000,
  /** Title nodes read beside a rendered result link. */
  TITLE_SELECTORS: Object.freeze({
    /** Title node rendered inside an Airtel Xstream grid result link. */
    GRID: '.cs-grid-tile-title',
    /** Title node rendered beside an Airtel Xstream hero result link. */
    HERO: '.hero-title',
    /** Poster image whose alt text labels a Tata Play Binge result. */
    BINGE: 'img.card-image[alt]',
  }),
});

/** Channel preference of a Tata Play Binge result: Chaupal wins over other matching channels. */
export const BINGE_CHANNEL_PREFERENCE = Object.freeze({
  selector: '.card-provider-logo img[alt]',
  label: 'Chaupal',
});

/** Settings of every provider search page, keyed by provider. */
export const SEARCH_PROVIDERS: Readonly<Record<SearchProvider, SearchProviderConfig>> = {
  [SearchProvider.XSTREAM]: {
    label: 'Airtel Xstream',
    origin: 'https://www.airtelxstream.in',
    inputId: 'classic-search-input-new',
    resultSelector:
      '#search-layout-container-searchResultV2 li.cs-grid-tile a.cs-grid-tile-button[href], ' +
      '.cs-hero-banner-rail .hero-banner-wrapper a.hero-banner[href]',
    marker: { kind: 'fragment', value: '#seer-auto' },
    detailPathPattern: /^\/(?:movies|tv-shows)\/([^/]+)\/([^/]+)\/?$/,
    stripTrailingSlash: false,
    button: {
      id: Constants.UI.IDS.SEER.XSTREAM_BUTTON,
      label: 'Xstream',
    },
  },
  [SearchProvider.BINGE]: {
    label: 'Tata Play Binge',
    origin: 'https://www.tataplaybinge.com',
    inputId: 'search-input',
    resultSelector: '.search-result-list a.listing-block[href]',
    // Browser verified: `?q=Yaaran%20Diyan%20Poun%20Baaran&seer-auto=1` keeps Binge's search
    // input clean and returns both matching ids, while `#seer-auto` becomes search text there.
    marker: { kind: 'query', name: 'seer-auto', value: '1' },
    detailPathPattern: /^\/watch\/(?:movies|shows|series)\/([^/]+)\/([1-9]\d*)\/?$/,
    stripTrailingSlash: true,
    button: {
      id: Constants.UI.IDS.SEER.BINGE_BUTTON,
      label: 'Binge',
    },
  },
};
