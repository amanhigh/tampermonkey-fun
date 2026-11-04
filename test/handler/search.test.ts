jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { SearchHandler } from '../../src/handler/search';
import { ISearchManager } from '../../src/manager/search';
import { SearchProvider } from '../../src/models/search';
import { Notifier } from '../../src/util/notify';
import { IObserveUtil } from '../../src/util/observer';

/** Search title every case arms. */
const TITLE = 'Dune';

/** Deadline after which an unresolved title reports the manual fallback. */
const TIMEOUT_MS = 15000;

/** Marker style arming one provider search page. */
type Marker =
  | { readonly kind: 'fragment'; readonly value: string }
  | { readonly kind: 'query'; readonly name: string; readonly value: string };

/** Settings that distinguish the two provider search pages under test. */
interface Provider {
  readonly label: string;
  readonly origin: string;
  readonly provider: SearchProvider;
  readonly inputId: string;
  readonly resultSelector: string;
  readonly detailPath: string;
  readonly marker: Marker;
}

/** Append the provider marker to a search url the way Seer opens it. */
function mark(searchUrl: string, marker: Marker): string {
  if (marker.kind === 'fragment') {
    return `${searchUrl}${marker.value}`;
  }
  const separator = new URL(searchUrl).search.length > 0 ? '&' : '?';
  return `${searchUrl}${separator}${marker.name}=${marker.value}`;
}

/** Provider configurations that share the one bounded lifecycle. */
const PROVIDERS: Provider[] = [
  {
    label: 'Airtel Xstream',
    origin: 'https://www.airtelxstream.in',
    provider: SearchProvider.XSTREAM,
    inputId: 'classic-search-input-new',
    resultSelector:
      '#search-layout-container-searchResultV2 li.cs-grid-tile a.cs-grid-tile-button[href], ' +
      '.cs-hero-banner-rail .hero-banner-wrapper a.hero-banner[href]',
    detailPath: '/movies/dune/HOTSTAR_DTH_MOVIE_9',
    marker: { kind: 'fragment', value: '#seer-auto' },
  },
  {
    label: 'Tata Play Binge',
    origin: 'https://www.tataplaybinge.com',
    provider: SearchProvider.BINGE,
    inputId: 'search-input',
    resultSelector: '.search-result-list a.listing-block[href]',
    detailPath: '/watch/movies/dune/9',
    // Browser verified: `?q=Yaaran%20Diyan%20Poun%20Baaran&seer-auto=1` keeps Binge's search
    // input clean and returns both matching ids, while `#seer-auto` becomes search text there.
    marker: { kind: 'query', name: 'seer-auto', value: '1' },
  },
];

type Listener = (event: Event) => void;

/** Element stand-in the handler recognises via `instanceof`, its id and the selector it sits inside. */
class FakeElement {
  constructor(
    readonly id = '',
    private readonly insideSelector?: string
  ) {}

  /** Report a result link only when the requested selector is the one this element sits inside. */
  closest(selector: string): object | null {
    return this.insideSelector === selector ? {} : null;
  }
}

/** Event registry shared by the document and window doubles. */
class FakeTarget {
  private readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener, options?: { signal?: AbortSignal }): void {
    const signal = options?.signal;
    if (signal?.aborted === true) {
      return;
    }
    this.listeners.set(type, [...this.registered(type), listener]);
    signal?.addEventListener('abort', () => this.removeEventListener(type, listener), { once: true });
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(
      type,
      this.registered(type).filter((candidate) => candidate !== listener)
    );
  }

  /** Invoke the listeners of one type, like the browser would. */
  dispatch(type: string, event: Record<string, unknown> = {}): void {
    [...this.registered(type)].forEach((listener) => listener(event as unknown as Event));
  }

  /** Number of listeners still registered across every type. */
  get count(): number {
    return [...this.listeners.values()].reduce((total, list) => total + list.length, 0);
  }

  private registered(type: string): Listener[] {
    return this.listeners.get(type) ?? [];
  }
}

/** Document stand-in carrying only the listener surface and observed root the handler uses. */
class FakeDocument extends FakeTarget {
  readonly documentElement = new FakeElement('document-root');
}

/** Window stand-in carrying the location surface the handler uses. */
class FakeWindow extends FakeTarget {
  readonly location = { href: '', replace: jest.fn() };
}

/** History stand-in rewriting the address bar like the browser does. */
class FakeHistory {
  state: unknown = { idx: 7 };
  readonly replaceState = jest.fn((state: unknown, _title: string, url: string) => {
    this.state = state;
    page.location.href = url;
  });
}

/** Observer stand-in released by the handler. */
class FakeObserver {
  readonly disconnect = jest.fn();
}

/** Observation util double handing the handler a controllable node observer. */
class FakeObserveUtil {
  readonly observer = new FakeObserver();
  target: Element | undefined;
  callback: (() => void) | undefined;
  options: MutationObserverInit | undefined;

  readonly nodeObserver = jest.fn((target: Element, callback: () => void, options?: MutationObserverInit) => {
    this.target = target;
    this.callback = callback;
    this.options = options;
    return this.observer as unknown as MutationObserver;
  });

  /** Run the registered node callback, like an inserted result node would. */
  fire(): void {
    this.callback?.();
  }
}

/** Document double installed for every case. */
let page: FakeWindow;
let fakeDocument: FakeDocument;
let fakeHistory: FakeHistory;
let observe: FakeObserveUtil;
let manager: jest.Mocked<ISearchManager>;
let handler: SearchHandler;
let savedGlobals: Map<string, PropertyDescriptor | undefined>;

/** Globals replaced by these tests and restored after each case. */
const PATCHED_GLOBALS = ['document', 'window', 'history', 'Element'] as const;

/** Publish a browser global without widening the test's own types. */
function installGlobal(name: string, value: unknown): void {
  (globalThis as unknown as Record<string, unknown>)[name] = value;
}

/** Load the given address in the window double. */
function visit(href: string): void {
  page.location.href = href;
}

beforeEach(() => {
  jest.useFakeTimers();

  savedGlobals = new Map(PATCHED_GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

  page = new FakeWindow();
  fakeDocument = new FakeDocument();
  fakeHistory = new FakeHistory();

  installGlobal('document', fakeDocument);
  installGlobal('window', page);
  installGlobal('history', fakeHistory);
  installGlobal('Element', FakeElement);

  observe = new FakeObserveUtil();
  manager = {
    getUrl: jest.fn(),
    findMatch: jest.fn().mockReturnValue(undefined),
  };
  handler = new SearchHandler(manager, observe as unknown as IObserveUtil);

  jest.mocked(Notifier.info).mockClear();
  jest.mocked(Notifier.error).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  savedGlobals.forEach((descriptor, name) => {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
      return;
    }
    delete (globalThis as unknown as Record<string, unknown>)[name];
  });
});

/** Run the single armed deadline. */
function reachDeadline(): void {
  jest.advanceTimersByTime(TIMEOUT_MS);
}

describe.each(PROVIDERS)('SearchHandler on $label', (provider: Provider) => {
  const searchUrl = `${provider.origin}/search?q=${TITLE}`;
  const markedUrl = mark(searchUrl, provider.marker);
  const detailUrl = `${provider.origin}${provider.detailPath}`;
  const host = new URL(provider.origin).host;
  const wrongMarkerUrl =
    provider.marker.kind === 'fragment'
      ? `${provider.origin}/search?q=${TITLE}#other`
      : `${provider.origin}/search?q=${TITLE}&${provider.marker.name}=0`;
  const invalidUrls: Array<[string, string]> = [
    ['a foreign origin', mark(`https://${host}.evil.test/search?q=${TITLE}`, provider.marker)],
    ['an insecure origin', mark(`http://${host}/search?q=${TITLE}`, provider.marker)],
    ['another provider route', mark(`${provider.origin}/discover?q=${TITLE}`, provider.marker)],
    ['a search page without the marker', searchUrl],
    ['a search page with another marker', wrongMarkerUrl],
    ['a blank query', mark(`${provider.origin}/search?q=%20%20`, provider.marker)],
    ['a missing query', mark(`${provider.origin}/search`, provider.marker)],
  ];
  if (provider.marker.kind === 'query') {
    invalidUrls.push(
      ['a marked page with a foreign fragment', `${markedUrl}#other`],
      ['a legacy fragment marker', `${provider.origin}/search?q=${TITLE}#seer-auto`]
    );
  }

  /** Arm the bounded match of this provider. */
  function start(): void {
    handler.search(provider.provider);
  }

  beforeEach(() => {
    visit(markedUrl);
  });

  describe('opt in', () => {
    it('does no work when only constructed', () => {
      new SearchHandler(manager, observe as unknown as IObserveUtil);

      expect(fakeHistory.replaceState).not.toHaveBeenCalled();
      expect(observe.nodeObserver).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('arms one deadline and one node observation on the marked search page of a non-blank query', () => {
      start();

      expect(fakeHistory.replaceState).toHaveBeenCalledWith({ idx: 7 }, '', searchUrl);
      expect(page.location.href).toBe(searchUrl);
      expect(jest.getTimerCount()).toBe(1);
      expect(fakeDocument.count).toBe(2);
      expect(page.count).toBe(3);
      expect(observe.nodeObserver).toHaveBeenCalledTimes(1);
      expect(observe.target).toBe(fakeDocument.documentElement);
      expect(observe.options).toEqual({ childList: true, subtree: true });
    });

    it('consumes only the marker while keeping every other query value encoded', () => {
      visit(mark(`${provider.origin}/search?lang=en&q=${encodeURIComponent('Dune: Part Two')}`, provider.marker));

      start();

      expect(fakeHistory.replaceState).toHaveBeenCalledWith(
        { idx: 7 },
        '',
        `${provider.origin}/search?lang=en&q=Dune%3A%20Part%20Two`
      );
      expect(page.location.href).toBe(`${provider.origin}/search?lang=en&q=Dune%3A%20Part%20Two`);
    });

    it('is idempotent across repeated searches', () => {
      start();
      start();
      start();

      expect(fakeHistory.replaceState).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);
      expect(observe.nodeObserver).toHaveBeenCalledTimes(1);

      manager.findMatch.mockReturnValue(detailUrl);
      observe.fire();

      expect(page.location.replace).toHaveBeenCalledTimes(1);
    });

    it.each(invalidUrls)('ignores %s', (_case: string, href: string) => {
      visit(href);

      start();

      expect(fakeHistory.replaceState).not.toHaveBeenCalled();
      expect(observe.nodeObserver).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);

      reachDeadline();

      expect(manager.findMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
    });
  });

  describe('matching', () => {
    it('follows a unique immediate result without waiting for the deadline', () => {
      manager.findMatch.mockReturnValue(detailUrl);

      start();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(manager.findMatch).toHaveBeenCalledWith(provider.provider, fakeDocument, TITLE);
      expect(page.location.replace).toHaveBeenCalledWith(detailUrl);
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('follows a result rendered after arming', () => {
      start();

      expect(page.location.replace).not.toHaveBeenCalled();

      manager.findMatch.mockReturnValue(detailUrl);
      observe.fire();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
      expect(manager.findMatch).toHaveBeenLastCalledWith(provider.provider, fakeDocument, TITLE);
      expect(page.location.replace).toHaveBeenCalledWith(detailUrl);
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('stays silent while the results are unresolved', () => {
      start();

      jest.advanceTimersByTime(TIMEOUT_MS - 1);
      observe.fire();
      observe.fire();

      expect(manager.findMatch).toHaveBeenCalledTimes(3);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(1);
    });

    it('matches on the final deadline check when no node callback arrived', () => {
      start();

      manager.findMatch.mockReturnValue(detailUrl);
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
      expect(page.location.replace).toHaveBeenCalledWith(detailUrl);
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
    });

    it('searches the decoded query title while keeping the encoded query', () => {
      visit(mark(`${provider.origin}/search?q=${encodeURIComponent('Dune: Part Two & More')}`, provider.marker));
      manager.findMatch.mockReturnValue(detailUrl);

      start();

      expect(manager.findMatch).toHaveBeenCalledWith(provider.provider, fakeDocument, 'Dune: Part Two & More');
      expect(fakeHistory.replaceState).toHaveBeenCalledWith(
        { idx: 7 },
        '',
        `${provider.origin}/search?q=Dune%3A%20Part%20Two%20%26%20More`
      );
    });

    it('reports one escaped manual fallback when no single result matches before the deadline', () => {
      start();

      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).toHaveBeenCalledTimes(1);
      const message = jest.mocked(Notifier.info).mock.calls[0][0];
      expect(message).toContain(`No single ${provider.label} result for &quot;${TITLE}&quot;`);
      expect(message).toContain('Pick the title manually');
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('cancels silently when another pushState changed the url before the deadline', () => {
      start();
      visit(`${provider.origin}/search?q=Other`);

      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does not navigate when the url changed while the results were matched', () => {
      manager.findMatch.mockImplementation(() => {
        visit(`${provider.origin}/search?q=Other`);
        return detailUrl;
      });

      start();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does not navigate when the url changed during a later match', () => {
      start();
      manager.findMatch.mockImplementation(() => {
        visit(`${provider.origin}/search?q=Other`);
        return detailUrl;
      });

      observe.fire();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('reports one escaped failure and stays on the search page', () => {
      manager.findMatch.mockImplementation(() => {
        throw new Error('Bad <b>markup</b> "here"');
      });

      start();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).toHaveBeenCalledTimes(1);
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).toContain(`${provider.label} match failed for &quot;${TITLE}&quot;`);
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;markup&lt;/b&gt;');
      expect(message).toContain('&quot;here&quot;');
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('reports one escaped failure when a later match throws and stops observing', () => {
      start();
      manager.findMatch.mockImplementation(() => {
        throw new Error('late <b>failure</b>');
      });

      observe.fire();
      observe.fire();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
      expect(Notifier.error).toHaveBeenCalledTimes(1);
      expect(jest.mocked(Notifier.error).mock.calls[0][0]).toContain('late &lt;b&gt;failure&lt;/b&gt;');
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('reports one escaped failure when the node observation cannot be set up', () => {
      observe.nodeObserver.mockImplementation(() => {
        throw new Error('Cannot <b>observe</b>');
      });

      start();

      expect(manager.findMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).toHaveBeenCalledTimes(1);
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).toContain(`${provider.label} match failed for &quot;${TITLE}&quot;`);
      expect(message).toContain('Cannot &lt;b&gt;observe&lt;/b&gt;');
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('cancellation', () => {
    it('cancels when the search box is edited', () => {
      start();

      fakeDocument.dispatch('input', { target: new FakeElement(provider.inputId) });
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('keeps waiting when another field is edited', () => {
      start();

      fakeDocument.dispatch('input', { target: new FakeElement('another-field') });
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
    });

    it('cancels when a rendered result is selected without intercepting the click', () => {
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();

      start();

      fakeDocument.dispatch('click', {
        target: new FakeElement('', provider.resultSelector),
        preventDefault,
        stopPropagation,
      });
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).not.toHaveBeenCalled();
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('keeps waiting when a click misses every result link', () => {
      start();

      fakeDocument.dispatch('click', { target: new FakeElement() });
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(2);
    });

    it.each(['pagehide', 'popstate', 'hashchange'])('cancels on %s', (type: string) => {
      start();

      page.dispatch(type);
      reachDeadline();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('releases the timer, the observation and the listeners once the match is done', () => {
      start();

      reachDeadline();

      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('ignores a late node callback after cancellation', () => {
      start();

      page.dispatch('pagehide');
      manager.findMatch.mockReturnValue(detailUrl);
      observe.fire();
      observe.fire();

      expect(manager.findMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('releases the run once even when cancelling repeats', () => {
      start();

      fakeDocument.dispatch('input', { target: new FakeElement(provider.inputId) });
      fakeDocument.dispatch('input', { target: new FakeElement(provider.inputId) });
      page.dispatch('pagehide');
      page.dispatch('hashchange');

      expect(observe.observer.disconnect).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
    });
  });
});
