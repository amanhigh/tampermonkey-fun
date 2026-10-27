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
  private title = '';
  private capturedHref = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners: Array<readonly [EventTarget, string, EventListener]> = [];

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

    this.title = title;
    url.hash = '';
    history.replaceState(history.state, '', url.href);
    this.capturedHref = window.location.href;

    this.watch();
    this.timer = setTimeout(this.match, MATCH_TIMEOUT_MS);
  }

  /** Watch the page for edits, selections, navigation and exit, never intercepting a click. */
  private watch(): void {
    this.listen(document, 'input', this.handleInput);
    this.listen(document, 'click', this.handleClick);
    this.listen(window, 'pagehide', this.cleanup);
    this.listen(window, 'popstate', this.cleanup);
    this.listen(window, 'hashchange', this.cleanup);
  }

  /** Register one listener so that cleanup can always remove it again. */
  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.listeners.push([target, type, listener]);
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
  private readonly match = (): void => {
    this.timer = undefined;
    if (!this.isCapturedLive()) {
      this.cleanup();
      return;
    }

    try {
      this.reportMatch(this.search.findXstreamMatch(document, this.title));
    } catch (error) {
      Notifier.error(
        escapeHtml(`Airtel Xstream match failed for "${this.title}": ${toMessage(error)}`),
        NOTICE_TIMEOUT_MS
      );
    } finally {
      this.cleanup();
    }
  };

  /** Navigate to the unique match or ask the user to pick one, only while the captured url is live. */
  private reportMatch(destination: string | undefined): void {
    if (!this.isCapturedLive()) {
      return;
    }
    if (destination === undefined) {
      Notifier.info(
        escapeHtml(`No single Airtel Xstream result for "${this.title}". Pick the title manually.`),
        NOTICE_TIMEOUT_MS
      );
      return;
    }
    window.location.replace(destination);
  }

  /** Report whether the live url is still the one captured after consuming the marker. */
  private isCapturedLive(): boolean {
    return window.location.href === this.capturedHref;
  }

  /** Release the timer and the page listeners of the finished run. */
  private readonly cleanup = (): void => {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.listeners.splice(0).forEach(([target, type, listener]) => {
      target.removeEventListener(type, listener);
    });
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
