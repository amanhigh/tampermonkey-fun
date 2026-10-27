import { ISearchManager } from '../manager/search';
import { Constants } from '../models/constant';
import { escapeHtml } from '../util/html';
import { Notifier } from '../util/notify';

/**
 * ISearchHandler arms the automatic result match of one marked Xstream search page.
 */
export interface ISearchHandler {
  /** Arm the one-shot match of the live Airtel Xstream search page, at most once per page. */
  searchXstream(): void;
}

/**
 * SearchHandler waits a fixed interval on the Airtel Xstream search page opened by
 * Seer, then follows the unique rendered result of its title or reports that the
 * result must be picked manually. It runs once per page and cancels on any user
 * action that takes the decision away from it.
 */
export class SearchHandler implements ISearchHandler {
  private started = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly controller = new AbortController();

  constructor(private readonly search: ISearchManager) {}

  /** @inheritdoc */
  searchXstream(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const url = new URL(window.location.href);
    const title = url.searchParams.get('q')?.trim() ?? '';
    const armed =
      url.origin === AIRTEL_ORIGIN &&
      url.pathname === SEARCH_PATH &&
      url.hash === Constants.SEER.AUTO_MARKER &&
      title.length > 0;
    if (!armed) {
      return;
    }

    url.hash = '';
    history.replaceState(history.state, '', url.href);
    const capturedHref = window.location.href;

    this.watch();
    this.timer = setTimeout(() => this.match(title, capturedHref), MATCH_TIMEOUT_MS);
  }

  /** Watch the page for edits, selections, navigation and exit, never intercepting a click. */
  private watch(): void {
    const signal = this.controller.signal;
    document.addEventListener('input', this.handleInput, { signal });
    document.addEventListener('click', this.handleClick, { signal });
    window.addEventListener('pagehide', this.cleanup, { signal });
    window.addEventListener('popstate', this.cleanup, { signal });
    window.addEventListener('hashchange', this.cleanup, { signal });
  }

  /** Cancel the pending match once the live search box is edited. */
  private readonly handleInput = (event: Event): void => {
    if (event.target instanceof Element && event.target.id === SEARCH_INPUT_ID) {
      this.cleanup();
    }
  };

  /** Cancel the pending match once a rendered result is selected, leaving the click untouched. */
  private readonly handleClick = (event: Event): void => {
    if (event.target instanceof Element && event.target.closest(RESULT_LINK_SELECTOR) !== null) {
      this.cleanup();
    }
  };

  /** Follow the unique result of the captured title, or report the manual fallback. */
  private match(title: string, capturedHref: string): void {
    this.cleanup();
    if (window.location.href !== capturedHref) {
      return;
    }

    try {
      const destination = this.search.findXstreamMatch(document, title);
      if (window.location.href !== capturedHref) {
        return;
      }
      if (destination === undefined) {
        Notifier.info(
          escapeHtml(`No single Airtel Xstream result for "${title}". Pick the title manually.`),
          NOTICE_TIMEOUT_MS
        );
        return;
      }
      window.location.replace(destination);
    } catch (error) {
      Notifier.error(escapeHtml(`Airtel Xstream match failed for "${title}": ${toMessage(error)}`), NOTICE_TIMEOUT_MS);
    }
  }

  /** Release the timer and the page listeners of the finished run. */
  private readonly cleanup = (): void => {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.controller.abort();
  };
}

/** Origin of the Airtel Xstream search page that carries the marker. */
const AIRTEL_ORIGIN = new URL(Constants.SEER.AIRTEL_BASE_URL).origin;

/** Pathname of the Airtel Xstream search page. */
const SEARCH_PATH = '/search';

/** Search box of the Airtel Xstream search page. */
const SEARCH_INPUT_ID = 'classic-search-input-new';

/** Rendered grid and hero result links of the Airtel Xstream search results. */
const RESULT_LINK_SELECTOR =
  '#search-layout-container-searchResultV2 li.cs-grid-tile a.cs-grid-tile-button[href], ' +
  '.cs-hero-banner-rail .hero-banner-wrapper a.hero-banner[href]';

/** Fixed wait before the rendered results are matched, without polling or retries. */
const MATCH_TIMEOUT_MS = 15000;

/** Display duration of a single notice or failure notification in milliseconds. */
const NOTICE_TIMEOUT_MS = 8000;

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
