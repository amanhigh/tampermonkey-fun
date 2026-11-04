import { ISearchManager } from '../manager/search';
import {
  SEARCH_CONSTANTS,
  SEARCH_PROVIDERS,
  SearchMarker,
  SearchProvider,
  SearchProviderConfig,
} from '../models/search';
import { escapeHtml } from '../util/html';
import { Notifier } from '../util/notify';
import { IObserveUtil } from '../util/observer';

/**
 * ISearchHandler arms the automatic result match of one marked provider search page.
 */
export interface ISearchHandler {
  /**
   * Start the bounded match of the live search page of one provider, at most once per page: one
   * immediate attempt, one attempt per observed node addition or removal, and one final attempt
   * at the deadline.
   * @param provider - Provider whose settings drive the run
   */
  search(provider: SearchProvider): void;
}

/**
 * SearchHandler follows the unique rendered result of the provider search page opened by
 * Seer. It matches the title as soon as it is armed and again on every node inserted into
 * the page, so a rendered result is followed at once while a 15 s deadline reports the
 * manual fallback when no single result ever appears. It runs once per page and cancels on
 * any user action that takes the decision away from it.
 */
export class SearchHandler implements ISearchHandler {
  private started = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private observer: MutationObserver | undefined;
  private readonly controller = new AbortController();

  constructor(
    private readonly manager: ISearchManager,
    private readonly observe: IObserveUtil
  ) {}

  /** @inheritdoc */
  search(provider: SearchProvider): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const config = SEARCH_PROVIDERS[provider];
    const url = new URL(window.location.href);
    const title = url.searchParams.get(SEARCH_CONSTANTS.SEARCH_QUERY_KEY)?.trim() ?? '';
    if (!isArmed(url, title, config)) {
      return;
    }

    history.replaceState(history.state, '', consumeMarker(url, config.marker));
    const capturedHref = window.location.href;

    try {
      this.watch(config);
      this.timer = setTimeout(() => this.match(title, capturedHref, provider, true), SEARCH_CONSTANTS.MATCH_TIMEOUT_MS);
      this.observer = this.observe.nodeObserver(
        document.documentElement,
        () => this.match(title, capturedHref, provider, false),
        { childList: true, subtree: true }
      );
      this.match(title, capturedHref, provider, false);
    } catch (error) {
      this.fail(title, error, config.label);
    }
  }

  /**
   * Watch the page for edits, selections, navigation and exit, never intercepting a click.
   * @param config - Provider whose search box and result links cancel the pending match
   */
  private watch(config: SearchProviderConfig): void {
    const signal = this.controller.signal;
    document.addEventListener(
      'input',
      (event) => {
        if (event.target instanceof Element && event.target.id === config.inputId) {
          this.cleanup();
        }
      },
      { signal }
    );
    document.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Element && event.target.closest(config.resultSelector) !== null) {
          this.cleanup();
        }
      },
      { signal }
    );
    window.addEventListener('pagehide', this.cleanup, { signal });
    window.addEventListener('popstate', this.cleanup, { signal });
    window.addEventListener('hashchange', this.cleanup, { signal });
  }

  /**
   * Match the captured title against the rendered results of the live page.
   * @param title - Search title captured when the run was armed
   * @param capturedHref - Live url captured when the run was armed
   * @param provider - Provider whose match method and label drive the outcome
   * @param final - Whether this is the deadline check that reports the manual fallback
   */
  private match(title: string, capturedHref: string, provider: SearchProvider, final: boolean): void {
    if (this.controller.signal.aborted) {
      return;
    }

    const label = SEARCH_PROVIDERS[provider].label;
    try {
      if (window.location.href !== capturedHref) {
        this.cleanup();
        return;
      }

      const destination = this.manager.findMatch(provider, document, title);

      if (this.controller.signal.aborted || window.location.href !== capturedHref) {
        this.cleanup();
        return;
      }
      if (destination === undefined) {
        if (!final) {
          return;
        }
        this.cleanup();
        Notifier.info(
          escapeHtml(`No single ${label} result for "${title}". Pick the title manually.`),
          SEARCH_CONSTANTS.NOTICE_TIMEOUT_MS
        );
        return;
      }

      this.cleanup();
      window.location.replace(destination);
    } catch (error) {
      this.fail(title, error, label);
    }
  }

  /**
   * Release the run and report its escaped match failure, including a failed setup.
   * @param title - Search title captured when the run was armed
   * @param error - Failure that ended the match
   * @param label - Human readable provider name used by the notification
   */
  private fail(title: string, error: unknown, label: string): void {
    this.cleanup();
    Notifier.error(
      escapeHtml(`${label} match failed for "${title}": ${toMessage(error)}`),
      SEARCH_CONSTANTS.NOTICE_TIMEOUT_MS
    );
  }

  /** Release the timer, the node observation and the page listeners of the finished run. */
  private readonly cleanup = (): void => {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.observer?.disconnect();
    this.observer = undefined;
    this.controller.abort();
  };
}

/**
 * Report whether a live url is the marked search page of one provider: exact origin and path, a
 * non-blank query, the provider marker, and no foreign fragment.
 * @param url - Live url of the provider page under test
 * @param title - Trimmed `q` title of the live url
 * @param config - Provider whose origin and marker drive the check
 */
function isArmed(url: URL, title: string, config: SearchProviderConfig): boolean {
  return (
    url.origin === config.origin &&
    url.pathname === SEARCH_CONSTANTS.SEARCH_PATH &&
    title.length > 0 &&
    isMarkerPresent(url, config.marker)
  );
}

/**
 * Report whether the live url carries exactly the marker of one provider, and no foreign fragment.
 * @param url - Live url of the provider page under test
 * @param marker - Provider marker arming the page
 */
function isMarkerPresent(url: URL, marker: SearchMarker): boolean {
  return marker.kind === 'fragment'
    ? url.hash === marker.value
    : url.hash === '' && url.searchParams.get(marker.name) === marker.value;
}

/**
 * Consume the marker of one provider and return the clean url, keeping every other query value
 * encoded as received as well as the history state.
 * @param url - Live url of the marked provider page
 * @param marker - Provider marker consumed from the url
 */
function consumeMarker(url: URL, marker: SearchMarker): string {
  if (marker.kind === 'fragment') {
    url.hash = '';
    return url.href;
  }

  url.search = url.search
    .slice(1)
    .split('&')
    .filter((pair) => pair.length > 0 && !new URLSearchParams(pair).has(marker.name))
    .join('&');
  return url.href;
}

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
