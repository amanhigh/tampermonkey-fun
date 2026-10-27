import { ISearchManager } from '../manager/search';
import { Constants } from '../models/constant';
import { escapeHtml } from '../util/html';
import { Notifier } from '../util/notify';
<<<<<<< HEAD
import { IObserveUtil } from '../util/observer';
=======
>>>>>>> master

/**
 * ISearchHandler arms the automatic result match of one marked Xstream search page.
 */
export interface ISearchHandler {
<<<<<<< HEAD
  /**
   * Start the bounded match of the live Airtel Xstream search page, at most once per page: one
   * immediate attempt, one attempt per observed node addition or removal, and one final attempt
   * at the deadline.
   */
=======
  /** Arm the one-shot match of the live Airtel Xstream search page, at most once per page. */
>>>>>>> master
  searchXstream(): void;
}

/**
<<<<<<< HEAD
 * SearchHandler follows the unique rendered result of the Airtel Xstream search page
 * opened by Seer. It matches the title as soon as it is armed and again on every node
 * inserted into the page, so a rendered result is followed at once while a 15 s deadline
 * reports the manual fallback when no single result ever appears. It runs once per page
 * and cancels on any user action that takes the decision away from it.
=======
 * SearchHandler waits a fixed interval on the Airtel Xstream search page opened by
 * Seer, then follows the unique rendered result of its title or reports that the
 * result must be picked manually. It runs once per page and cancels on any user
 * action that takes the decision away from it.
>>>>>>> master
 */
export class SearchHandler implements ISearchHandler {
  private started = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
<<<<<<< HEAD
  private observer: MutationObserver | undefined;
  private readonly controller = new AbortController();

  constructor(
    private readonly search: ISearchManager,
    private readonly observe: IObserveUtil
  ) {}
=======
  private readonly controller = new AbortController();

  constructor(private readonly search: ISearchManager) {}
>>>>>>> master

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

<<<<<<< HEAD
    try {
      this.watch();
      this.timer = setTimeout(() => this.match(title, capturedHref, true), MATCH_TIMEOUT_MS);
      this.observer = this.observe.nodeObserver(
        document.documentElement,
        () => this.match(title, capturedHref, false),
        { childList: true, subtree: true }
      );
      this.match(title, capturedHref, false);
    } catch (error) {
      this.fail(title, error);
    }
=======
    this.watch();
    this.timer = setTimeout(() => this.match(title, capturedHref), MATCH_TIMEOUT_MS);
>>>>>>> master
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

<<<<<<< HEAD
  /**
   * Match the captured title against the rendered results of the live page.
   * @param title - Search title captured when the run was armed
   * @param capturedHref - Live url captured when the run was armed
   * @param final - Whether this is the deadline check that reports the manual fallback
   */
  private match(title: string, capturedHref: string, final: boolean): void {
    if (this.controller.signal.aborted) {
=======
  /** Follow the unique result of the captured title, or report the manual fallback. */
  private match(title: string, capturedHref: string): void {
    this.cleanup();
    if (window.location.href !== capturedHref) {
>>>>>>> master
      return;
    }

    try {
<<<<<<< HEAD
      if (window.location.href !== capturedHref) {
        this.cleanup();
        return;
      }

      const destination = this.search.findXstreamMatch(document, title);

      if (this.controller.signal.aborted || window.location.href !== capturedHref) {
        this.cleanup();
        return;
      }
      if (destination === undefined) {
        if (!final) {
          return;
        }
        this.cleanup();
=======
      const destination = this.search.findXstreamMatch(document, title);
      if (window.location.href !== capturedHref) {
        return;
      }
      if (destination === undefined) {
>>>>>>> master
        Notifier.info(
          escapeHtml(`No single Airtel Xstream result for "${title}". Pick the title manually.`),
          NOTICE_TIMEOUT_MS
        );
        return;
      }
<<<<<<< HEAD

      this.cleanup();
      window.location.replace(destination);
    } catch (error) {
      this.fail(title, error);
    }
  }

  /** Release the run and report its escaped match failure, including a failed setup. */
  private fail(title: string, error: unknown): void {
    this.cleanup();
    Notifier.error(escapeHtml(`Airtel Xstream match failed for "${title}": ${toMessage(error)}`), NOTICE_TIMEOUT_MS);
  }

  /** Release the timer, the node observation and the page listeners of the finished run. */
=======
      window.location.replace(destination);
    } catch (error) {
      Notifier.error(escapeHtml(`Airtel Xstream match failed for "${title}": ${toMessage(error)}`), NOTICE_TIMEOUT_MS);
    }
  }

  /** Release the timer and the page listeners of the finished run. */
>>>>>>> master
  private readonly cleanup = (): void => {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
<<<<<<< HEAD
    this.observer?.disconnect();
    this.observer = undefined;
=======
>>>>>>> master
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

<<<<<<< HEAD
/** Deadline after which the unmatched title reports the manual fallback once. */
=======
/** Fixed wait before the rendered results are matched, without polling or retries. */
>>>>>>> master
const MATCH_TIMEOUT_MS = 15000;

/** Display duration of a single notice or failure notification in milliseconds. */
const NOTICE_TIMEOUT_MS = 8000;

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
