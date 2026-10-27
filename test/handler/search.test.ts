jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { SearchHandler } from '../../src/handler/search';
import { ISearchManager } from '../../src/manager/search';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';

/** Airtel Xstream origin used by every case. */
const AIRTEL = Constants.SEER.AIRTEL_BASE_URL;

/** Marker Seer appends to the search url it opens. */
const MARKER = Constants.SEER.AUTO_MARKER;

/** Search url without the marker, as captured after it is consumed. */
const SEARCH_URL = `${AIRTEL}/search?q=Dune`;

/** Search url Seer opens, carrying the marker. */
const MARKED_URL = `${SEARCH_URL}${MARKER}`;

/** Unique result the manager resolves by default. */
const DETAIL_URL = `${AIRTEL}/movies/dune/HOTSTAR_DTH_MOVIE_9`;

/** Fixed wait the handler arms once. */
const TIMEOUT_MS = 15000;

/** Search box id whose edits cancel the pending match. */
const SEARCH_INPUT_ID = 'classic-search-input-new';

type Listener = (event: Event) => void;

/** Element stand-in the handler recognises via `instanceof` and reads for its id and closest result. */
class FakeElement {
  constructor(
    readonly id = '',
    private readonly insideResult = false
  ) {}

  /** Report a result link only for elements marked as rendered results. */
  closest(): object | null {
    return this.insideResult ? {} : null;
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

/** Document stand-in carrying only the listener surface the handler uses. */
class FakeDocument extends FakeTarget {}

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

/** Document double installed for every case. */
let page: FakeWindow;
let fakeDocument: FakeDocument;
let fakeHistory: FakeHistory;
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
  visit(MARKED_URL);

  installGlobal('document', fakeDocument);
  installGlobal('window', page);
  installGlobal('history', fakeHistory);
  installGlobal('Element', FakeElement);

  manager = {
    getXstreamUrl: jest.fn(),
    findXstreamMatch: jest.fn().mockReturnValue(DETAIL_URL),
  };
  handler = new SearchHandler(manager);

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

/** Run the single armed wait to its deadline. */
function reachDeadline(): void {
  jest.advanceTimersByTime(TIMEOUT_MS);
}

describe('SearchHandler', () => {
  describe('opt in', () => {
    it('does no work when only constructed', () => {
      new SearchHandler(manager);

      expect(fakeHistory.replaceState).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('arms one fixed wait on the marked search page of a non-blank query', () => {
      handler.searchXstream();

      expect(fakeHistory.replaceState).toHaveBeenCalledWith({ idx: 7 }, '', SEARCH_URL);
      expect(page.location.href).toBe(SEARCH_URL);
      expect(jest.getTimerCount()).toBe(1);
      expect(fakeDocument.count).toBe(2);
      expect(page.count).toBe(3);
    });

    it('is idempotent across repeated searches', () => {
      handler.searchXstream();
      handler.searchXstream();
      handler.searchXstream();

      expect(fakeHistory.replaceState).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);

      reachDeadline();

      expect(manager.findXstreamMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a foreign origin', `https://www.airtelxstream.in.evil.test/search?q=Dune${MARKER}`],
      ['an insecure origin', `http://www.airtelxstream.in/search?q=Dune${MARKER}`],
      ['another Airtel Xstream route', `${AIRTEL}/discover?q=Dune${MARKER}`],
      ['a search page without the marker', SEARCH_URL],
      ['a search page with another fragment', `${AIRTEL}/search?q=Dune#other`],
      ['a blank query', `${AIRTEL}/search?q=%20%20${MARKER}`],
      ['a missing query', `${AIRTEL}/search${MARKER}`],
    ])('ignores %s', (_case: string, href: string) => {
      visit(href);

      handler.searchXstream();

      expect(fakeHistory.replaceState).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);

      reachDeadline();

      expect(manager.findXstreamMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
    });
  });

  describe('matching', () => {
    it('waits the full fixed interval before matching once', () => {
      handler.searchXstream();

      jest.advanceTimersByTime(TIMEOUT_MS - 1);
      expect(manager.findXstreamMatch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);

      expect(manager.findXstreamMatch).toHaveBeenCalledTimes(1);
      expect(manager.findXstreamMatch).toHaveBeenCalledWith(fakeDocument, 'Dune');
      expect(page.location.replace).toHaveBeenCalledWith(DETAIL_URL);
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('searches the decoded query title while keeping the encoded query', () => {
      visit(`${AIRTEL}/search?q=${encodeURIComponent('Dune: Part Two & More')}${MARKER}`);

      handler.searchXstream();
      reachDeadline();

      expect(manager.findXstreamMatch).toHaveBeenCalledWith(fakeDocument, 'Dune: Part Two & More');
      expect(fakeHistory.replaceState).toHaveBeenCalledWith(
        { idx: 7 },
        '',
        `${AIRTEL}/search?q=Dune%3A%20Part%20Two%20%26%20More`
      );
    });

    it('reports one escaped manual fallback when no single result matches', () => {
      manager.findXstreamMatch.mockReturnValue(undefined);
      handler.searchXstream();

      reachDeadline();

      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).toHaveBeenCalledTimes(1);
      const message = jest.mocked(Notifier.info).mock.calls[0][0];
      expect(message).toContain('No single Airtel Xstream result for &quot;Dune&quot;');
      expect(message).toContain('Pick the title manually');
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('cancels silently when another pushState changed the url before the deadline', () => {
      handler.searchXstream();
      visit(`${AIRTEL}/search?q=Other`);

      reachDeadline();

      expect(manager.findXstreamMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('does not navigate when the url changed while the results were matched', () => {
      manager.findXstreamMatch.mockImplementation(() => {
        visit(`${AIRTEL}/search?q=Other`);
        return DETAIL_URL;
      });
      handler.searchXstream();

      reachDeadline();

      expect(manager.findXstreamMatch).toHaveBeenCalledTimes(1);
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('reports one escaped failure and stays on the search page', () => {
      manager.findXstreamMatch.mockImplementation(() => {
        throw new Error('Bad <b>markup</b> "here"');
      });
      handler.searchXstream();

      reachDeadline();

      expect(page.location.replace).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).toHaveBeenCalledTimes(1);
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).toContain('Airtel Xstream match failed for &quot;Dune&quot;');
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;markup&lt;/b&gt;');
      expect(message).toContain('&quot;here&quot;');
    });
  });

  describe('cancellation', () => {
    it('cancels when the search box is edited', () => {
      handler.searchXstream();

      fakeDocument.dispatch('input', { target: new FakeElement(SEARCH_INPUT_ID) });
      reachDeadline();

      expect(manager.findXstreamMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('keeps waiting when another field is edited', () => {
      handler.searchXstream();

      fakeDocument.dispatch('input', { target: new FakeElement('another-field') });
      reachDeadline();

      expect(manager.findXstreamMatch).toHaveBeenCalledTimes(1);
    });

    it('cancels when a rendered grid or hero result is selected without intercepting the click', () => {
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();
      handler.searchXstream();

      fakeDocument.dispatch('click', { target: new FakeElement('', true), preventDefault, stopPropagation });
      reachDeadline();

      expect(manager.findXstreamMatch).not.toHaveBeenCalled();
      expect(page.location.replace).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).not.toHaveBeenCalled();
    });

    it('keeps waiting when a click misses every result link', () => {
      handler.searchXstream();

      fakeDocument.dispatch('click', { target: new FakeElement() });
      reachDeadline();

      expect(manager.findXstreamMatch).toHaveBeenCalledTimes(1);
    });

    it.each(['pagehide', 'popstate', 'hashchange'])('cancels on %s', (type: string) => {
      handler.searchXstream();

      page.dispatch(type);
      reachDeadline();

      expect(manager.findXstreamMatch).not.toHaveBeenCalled();
      expect(Notifier.info).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('releases the timer and listeners once the match is done', () => {
      handler.searchXstream();

      reachDeadline();

      expect(fakeDocument.count).toBe(0);
      expect(page.count).toBe(0);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
