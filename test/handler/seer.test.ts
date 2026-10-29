import { SeerHandler } from '../../src/handler/seer';
import { ISearchManager } from '../../src/manager/search';
import { ISeerManager } from '../../src/manager/seer';
import { Constants } from '../../src/models/shared/constant';

// The handler must only call Notifier; its DOM rendering is out of scope here.
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { Notifier } from '../../src/util/notify';

/** Poll interval the handler uses to keep the panel in sync with the route. */
const POLL_MS = 400;

/** Delay the handler waits before refreshing the deleted route. */
const REFRESH_MS = 2000;

/** Display duration of the failure notification. */
const FAILURE_TIMEOUT_MS = 8000;

/** Detail route tracked by most tests. */
const MOVIE_ROUTE = '/movie/603';

/** Other detail route used to simulate same-page navigation. */
const TV_ROUTE = '/tv/1399';

/** Route without a Delete button. */
const UNSUPPORTED_ROUTE = '/discover';

/** Promise with its resolver kept out of the handler call. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

/** Build a promise that a test settles when it decides the operation is done. */
function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Minimal element stand-in covering the DOM surface the handler uses. */
class FakeElement {
  readonly children: FakeElement[] = [];
  id = '';
  className = '';
  type = '';
  textContent = '';
  disabled = false;
  hidden = false;
  private readonly listeners: Array<() => void> = [];

  constructor(
    readonly tagName: string,
    private readonly registry: Map<string, FakeElement>
  ) {}

  appendChild(child: FakeElement): void {
    this.children.push(child);
    this.register(child);
  }

  addEventListener(_type: string, listener: () => void): void {
    this.listeners.push(listener);
  }

  /** Invoke the click listeners; the handler must guard its own re-entrancy. */
  click(): void {
    [...this.listeners].forEach((listener) => listener());
  }

  remove(): void {
    this.unregister();
  }

  private register(element: FakeElement): void {
    if (element.id) {
      this.registry.set(element.id, element);
    }
    element.children.forEach((child) => this.register(child));
  }

  private unregister(): void {
    if (this.id) {
      this.registry.delete(this.id);
    }
    this.children.forEach((child) => child.unregister());
  }
}

/** Element stand-in accepted by the handler's `instanceof HTMLButtonElement` check. */
class FakeButtonElement extends FakeElement {
  constructor(registry: Map<string, FakeElement>) {
    super('button', registry);
  }
}

/** Document stand-in backed by an id registry. */
class FakeDocument {
  private readonly elements = new Map<string, FakeElement>();
  readonly body = new FakeElement('body', this.elements);
  readonly created: FakeElement[] = [];

  createElement(tagName: string): FakeElement {
    const element =
      tagName === 'button' ? new FakeButtonElement(this.elements) : new FakeElement(tagName, this.elements);
    this.created.push(element);
    return element;
  }

  getElementById(id: string): FakeElement | undefined {
    return this.elements.get(id);
  }

  /** Elements created with the given tag name, mounted or not. */
  createdWithTag(tagName: string): FakeElement[] {
    return this.created.filter((element) => element.tagName === tagName);
  }
}

/** Window stand-in carrying the location and listener surface the handler uses. */
class FakeWindow {
  readonly location = { pathname: '/', reload: jest.fn() };
  private readonly listeners = new Set<() => void>();

  addEventListener(_type: string, listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: () => void): void {
    this.listeners.delete(listener);
  }

  dispatch(type: string): void {
    if (type === 'pagehide') {
      [...this.listeners].forEach((listener) => listener());
    }
  }
}

/** Publish a browser global without widening the test's own types. */
function installGlobal(name: string, value: unknown): void {
  (globalThis as unknown as Record<string, unknown>)[name] = value;
}

/** Globals replaced by these tests and restored after each case. */
const PATCHED_GLOBALS = ['document', 'window', 'HTMLButtonElement', 'confirm', 'GM'] as const;

/** Search url the manager resolves by default. */
const XSTREAM_URL = 'https://www.airtelxstream.in/search?q=Dune';

describe('SeerHandler', () => {
  let fakeDocument: FakeDocument;
  let fakeWindow: FakeWindow;
  let manager: jest.Mocked<ISeerManager>;
  let search: jest.Mocked<ISearchManager>;
  let handler: SeerHandler;
  let confirmMock: jest.Mock;
  let openInTabMock: jest.Mock;
  let savedGlobals: Map<string, PropertyDescriptor | undefined>;

  beforeEach(() => {
    jest.useFakeTimers();

    savedGlobals = new Map(
      PATCHED_GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
    );

    fakeDocument = new FakeDocument();
    fakeWindow = new FakeWindow();
    fakeWindow.location.pathname = MOVIE_ROUTE;
    confirmMock = jest.fn().mockReturnValue(true);
    openInTabMock = jest.fn().mockResolvedValue(undefined);

    installGlobal('document', fakeDocument);
    installGlobal('window', fakeWindow);
    installGlobal('HTMLButtonElement', FakeButtonElement);
    installGlobal('confirm', confirmMock);
    installGlobal('GM', { openInTab: openInTabMock });

    manager = {
      isDetailPage: jest.fn().mockImplementation((pathname: string) => pathname !== UNSUPPORTED_ROUTE),
      hasMediaRecord: jest.fn().mockResolvedValue(true),
      getMediaTitle: jest.fn().mockResolvedValue('Dune'),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    };
    search = {
      getXstreamUrl: jest.fn().mockResolvedValue(XSTREAM_URL),
      findXstreamMatch: jest.fn(),
    };
    jest.mocked(Notifier.success).mockClear();
    jest.mocked(Notifier.error).mockClear();

    handler = new SeerHandler(manager, search);
  });

  afterEach(() => {
    // Release the handler's poll timer while the fakes are still installed.
    fakeWindow.dispatch('pagehide');
    jest.useRealTimers();
    savedGlobals.forEach((descriptor, name) => {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
        return;
      }
      delete (globalThis as unknown as Record<string, unknown>)[name];
    });
  });

  /** Initialize the handler on the current route and await its presence check. */
  async function openRoute(): Promise<void> {
    handler.initialize();
    await flush();
  }

  /** Flush the microtasks queued by the handler's async flow. */
  async function flush(): Promise<void> {
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(0);
  }

  /** Advance the pending refresh delay and flush the work it releases. */
  async function advanceRefresh(): Promise<void> {
    await jest.advanceTimersByTimeAsync(REFRESH_MS);
    await flush();
  }

  /** Mounted panel, if any. */
  function panel(): FakeElement | undefined {
    return fakeDocument.getElementById(Constants.UI.IDS.SEER.PANEL);
  }

  /** Mounted Delete button, if any. */
  function deleteButton(): FakeElement | undefined {
    return fakeDocument.getElementById(Constants.UI.IDS.SEER.DELETE_BUTTON);
  }

  /** Mounted Search Xstream button, if any. */
  function xstreamButton(): FakeElement | undefined {
    return fakeDocument.getElementById(Constants.UI.IDS.SEER.XSTREAM_BUTTON);
  }

  /** Click the mounted Search Xstream button and let the queued work start. */
  async function clickXstream(): Promise<void> {
    xstreamButton()?.click();
    await flush();
  }

  /** Click the mounted Delete button and let the queued work start. */
  async function clickDelete(): Promise<void> {
    deleteButton()?.click();
    await flush();
  }

  /** Simulate a same-page route change without waiting for the poll. */
  function navigate(pathname: string): void {
    fakeWindow.location.pathname = pathname;
  }

  describe('initialize', () => {
    it('mounts the Search Xstream and Delete buttons once', async () => {
      await openRoute();
      await openRoute();

      expect(fakeDocument.createdWithTag('div')).toHaveLength(1);
      expect(fakeDocument.createdWithTag('button')).toHaveLength(2);
      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(1);
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
      expect(deleteButton()?.hidden).toBe(false);
    });

    it('mounts the Delete button hidden until the media record is verified', async () => {
      const presence = defer<boolean>();
      manager.hasMediaRecord.mockReturnValue(presence.promise);

      handler.initialize();
      await flush();

      expect(panel()?.hidden).toBe(false);
      expect(xstreamButton()?.hidden).toBe(false);
      expect(deleteButton()?.hidden).toBe(true);

      presence.resolve(true);
      await flush();

      expect(deleteButton()?.hidden).toBe(false);
    });

    it('hides the Delete button when the route has no media record', async () => {
      manager.hasMediaRecord.mockResolvedValue(false);

      await openRoute();

      expect(panel()?.hidden).toBe(false);
      expect(deleteButton()?.hidden).toBe(true);
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('verifies the media record once per route entry only', async () => {
      await openRoute();

      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(1);
      expect(manager.hasMediaRecord).toHaveBeenCalledWith(MOVIE_ROUTE);

      navigate(UNSUPPORTED_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(1);

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(2);
      expect(manager.hasMediaRecord).toHaveBeenCalledWith(TV_ROUTE);
    });

    it('reports one escaped media lookup failure per route entry without retrying', async () => {
      manager.hasMediaRecord.mockRejectedValue(new Error('lookup <b>failed</b> "now"'));

      await openRoute();

      expect(Notifier.error).toHaveBeenCalledWith(
        expect.stringContaining('Seer media lookup failed for /movie/603'),
        FAILURE_TIMEOUT_MS
      );
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;failed&lt;/b&gt;');
      expect(message).toContain('&quot;now&quot;');
      expect(deleteButton()?.hidden).toBe(true);

      await jest.advanceTimersByTimeAsync(POLL_MS);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(1);
      expect(Notifier.error).toHaveBeenCalledTimes(1);
    });

    it('discards a stale presence success when the route returns to the same detail page', async () => {
      const first = defer<boolean>();
      manager.hasMediaRecord.mockReturnValueOnce(first.promise).mockResolvedValueOnce(false);

      handler.initialize();
      await flush();
      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(1);

      navigate(UNSUPPORTED_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);
      navigate(MOVIE_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);
      await flush();

      expect(manager.hasMediaRecord).toHaveBeenCalledTimes(2);
      expect(deleteButton()?.hidden).toBe(true);

      first.resolve(true);
      await flush();

      expect(deleteButton()?.hidden).toBe(true);
    });

    it('discards a stale presence failure when the route returns to the same detail page', async () => {
      const first = defer<boolean>();
      manager.hasMediaRecord.mockReturnValueOnce(first.promise).mockResolvedValueOnce(true);

      handler.initialize();
      await flush();

      navigate(UNSUPPORTED_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);
      navigate(MOVIE_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);
      await flush();

      expect(deleteButton()?.hidden).toBe(false);

      first.reject(new Error('stale <boom>'));
      await flush();

      expect(Notifier.error).not.toHaveBeenCalled();
      expect(deleteButton()?.hidden).toBe(false);
    });

    it('discards a pending presence result after the page exits', async () => {
      const presence = defer<boolean>();
      manager.hasMediaRecord.mockReturnValue(presence.promise);

      handler.initialize();
      await flush();
      fakeWindow.dispatch('pagehide');

      presence.resolve(true);
      await flush();

      expect(panel()).toBeUndefined();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('shows the panel only on detail routes', async () => {
      await openRoute();
      expect(panel()?.hidden).toBe(false);

      navigate(UNSUPPORTED_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(panel()?.hidden).toBe(true);
      expect(deleteButton()?.hidden).toBe(true);

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(panel()?.hidden).toBe(false);
      expect(deleteButton()?.hidden).toBe(false);
      expect(manager.deleteMedia).not.toHaveBeenCalled();
      expect(search.getXstreamUrl).not.toHaveBeenCalled();
    });

    it('hides the panel on an unsupported route before the first poll', async () => {
      fakeWindow.location.pathname = UNSUPPORTED_ROUTE;

      await openRoute();

      expect(panel()?.hidden).toBe(true);
      expect(manager.hasMediaRecord).not.toHaveBeenCalled();
    });

    it('removes the panel and stops polling when the page exits', async () => {
      await openRoute();
      expect(jest.getTimerCount()).toBe(1);

      fakeWindow.dispatch('pagehide');

      expect(panel()).toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('xstream search', () => {
    it('opens the resolved search url in the foreground tab of the live route captured at click', async () => {
      await openRoute();
      navigate(TV_ROUTE);

      await clickXstream();

      expect(search.getXstreamUrl).toHaveBeenCalledTimes(1);
      expect(search.getXstreamUrl).toHaveBeenCalledWith(TV_ROUTE);
      expect(openInTabMock).toHaveBeenCalledTimes(1);
      expect(openInTabMock).toHaveBeenCalledWith(XSTREAM_URL, { active: true, setParent: true });
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('does nothing on an unsupported live route', async () => {
      await openRoute();
      navigate(UNSUPPORTED_ROUTE);

      await clickXstream();

      expect(search.getXstreamUrl).not.toHaveBeenCalled();
      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('disables only the search button while opening and ignores duplicate clicks', async () => {
      const lookup = defer<string>();
      search.getXstreamUrl.mockReturnValue(lookup.promise);
      await openRoute();

      xstreamButton()?.click();
      xstreamButton()?.click();
      await flush();

      expect(search.getXstreamUrl).toHaveBeenCalledTimes(1);
      expect(xstreamButton()?.textContent).toBe('Opening Xstream…');
      expect(xstreamButton()?.disabled).toBe(true);
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
      expect(openInTabMock).not.toHaveBeenCalled();

      lookup.resolve(XSTREAM_URL);
      await flush();

      expect(openInTabMock).toHaveBeenCalledTimes(1);
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('opens no tab for a route that changed during the lookup', async () => {
      const lookup = defer<string>();
      search.getXstreamUrl.mockReturnValue(lookup.promise);
      await openRoute();
      await clickXstream();

      navigate(TV_ROUTE);
      lookup.resolve(XSTREAM_URL);
      await flush();

      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('opens no tab and reports nothing after the page exits during the lookup', async () => {
      const lookup = defer<string>();
      search.getXstreamUrl.mockReturnValue(lookup.promise);
      await openRoute();
      await clickXstream();

      fakeWindow.dispatch('pagehide');
      lookup.resolve(XSTREAM_URL);
      await flush();

      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('reports an escaped lookup failure for eight seconds and restores the button', async () => {
      search.getXstreamUrl.mockRejectedValue(new Error('No Seer title for <b>/movie/603</b> "detail"'));
      await openRoute();

      await clickXstream();

      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.error).toHaveBeenCalledWith(
        expect.stringContaining('Seer Xstream search failed for /movie/603'),
        FAILURE_TIMEOUT_MS
      );
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;/movie/603&lt;/b&gt;');
      expect(message).toContain('&quot;detail&quot;');
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('reports a failure when the tab cannot be opened', async () => {
      openInTabMock.mockRejectedValue(new Error('GM.openInTab <denied>'));
      await openRoute();

      await clickXstream();

      expect(search.getXstreamUrl).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.error).toHaveBeenCalledWith(
        expect.stringContaining('Seer Xstream search failed for /movie/603'),
        FAILURE_TIMEOUT_MS
      );
      expect(jest.mocked(Notifier.error).mock.calls[0][0]).toContain('&lt;denied&gt;');
      expect(xstreamButton()?.textContent).toBe('▶️ Xtreme');
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('stays silent when the lookup fails after navigating away', async () => {
      search.getXstreamUrl.mockImplementation(() => {
        navigate(TV_ROUTE);
        return Promise.reject(new Error('boom'));
      });
      await openRoute();

      await clickXstream();

      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(xstreamButton()?.disabled).toBe(false);
    });

    it('opens the search while the Delete button is hidden for a route without a media record', async () => {
      manager.hasMediaRecord.mockResolvedValue(false);
      await openRoute();

      expect(deleteButton()?.hidden).toBe(true);

      await clickXstream();

      expect(openInTabMock).toHaveBeenCalledTimes(1);
      expect(Notifier.error).not.toHaveBeenCalled();
    });

    it('opens the search while the media record lookup is still pending', async () => {
      const presence = defer<boolean>();
      manager.hasMediaRecord.mockReturnValue(presence.promise);
      handler.initialize();
      await flush();

      expect(deleteButton()?.hidden).toBe(true);

      await clickXstream();

      expect(openInTabMock).toHaveBeenCalledTimes(1);

      presence.resolve(true);
      await flush();

      expect(deleteButton()?.hidden).toBe(false);
    });
  });

  describe('delete flow', () => {
    it('deletes the captured route once and refreshes it after the delay', async () => {
      await openRoute();

      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(confirmMock.mock.calls[0][0]).toContain('cannot be undone');
      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(search.getXstreamUrl).not.toHaveBeenCalled();
      expect(openInTabMock).not.toHaveBeenCalled();
      expect(Notifier.success).toHaveBeenCalledWith(
        'Deleted &quot;Dune&quot;. Library files, requests and media entry removed. The page will refresh.'
      );
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('keeps the button busy until the pending refresh runs', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      await openRoute();

      deleteButton()?.click();

      expect(deleteButton()?.textContent).toBe('Deleting…');
      expect(deleteButton()?.disabled).toBe(true);

      deletion.resolve();
      await flush();

      expect(deleteButton()?.textContent).toBe('Deleting…');
      expect(deleteButton()?.disabled).toBe(true);

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('does nothing when the confirmation is cancelled', async () => {
      confirmMock.mockReturnValue(false);
      await openRoute();

      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).not.toHaveBeenCalled();
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
    });

    it('ignores duplicate clicks while the deletion and its refresh are running', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      await openRoute();

      deleteButton()?.click();
      deleteButton()?.click();
      deleteButton()?.click();
      await flush();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);

      deletion.resolve();
      await flush();

      deleteButton()?.click();
      await flush();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('ignores a stale panel click on an unsupported live route', async () => {
      await openRoute();
      navigate(UNSUPPORTED_ROUTE);

      await clickDelete();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
    });

    it('ignores a click while the route has no media record', async () => {
      manager.hasMediaRecord.mockResolvedValue(false);
      await openRoute();

      expect(deleteButton()?.hidden).toBe(true);

      await clickDelete();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
    });

    it('ignores a click after the page exits', async () => {
      await openRoute();
      const button = deleteButton();

      fakeWindow.dispatch('pagehide');
      button?.click();
      await flush();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
    });

    it('rejects a stale click on a changed route before the next poll, then deletes it once verified', async () => {
      await openRoute();
      navigate(TV_ROUTE);

      await clickDelete();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
      expect(deleteButton()?.hidden).toBe(false);

      await jest.advanceTimersByTimeAsync(POLL_MS);
      await flush();

      expect(manager.hasMediaRecord).toHaveBeenCalledWith(TV_ROUTE);
      expect(deleteButton()?.hidden).toBe(false);

      await clickDelete();
      await advanceRefresh();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(TV_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith(
        'Deleted &quot;Dune&quot;. Library files, requests and media entry removed. The page will refresh.'
      );
      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('keeps the deletion busy state when a route change hides the Delete button', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      manager.hasMediaRecord.mockResolvedValueOnce(true).mockResolvedValue(false);
      await openRoute();

      deleteButton()?.click();
      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(deleteButton()?.hidden).toBe(true);
      expect(deleteButton()?.textContent).toBe('Deleting…');
      expect(deleteButton()?.disabled).toBe(true);

      deletion.resolve();
      await flush();
      await advanceRefresh();

      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('notifies a failure with escaped HTML for eight seconds and never reloads', async () => {
      manager.deleteMedia.mockRejectedValue(new Error('Seer file deletion failed: <b>4k</b> "files"'));
      await openRoute();

      await clickDelete();

      expect(Notifier.error).toHaveBeenCalledWith(
        expect.stringContaining('Deletion failed for &quot;Dune&quot;'),
        FAILURE_TIMEOUT_MS
      );
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;4k&lt;/b&gt;');
      expect(message).toContain('&quot;files&quot;');
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('falls back to the captured route when the title lookup fails and still deletes', async () => {
      manager.getMediaTitle.mockRejectedValue(new Error('No Seer title for /movie/603'));
      await openRoute();

      await clickDelete();

      expect(manager.getMediaTitle).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(Notifier.success).toHaveBeenCalledWith(
        'Deleted &quot;/movie/603&quot;. Library files, requests and media entry removed. The page will refresh.'
      );

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('keeps the escaped title captured before a navigation through the whole deletion', async () => {
      const lookup = defer<string>();
      manager.getMediaTitle.mockReturnValue(lookup.promise);
      await openRoute();
      await clickDelete();

      navigate(TV_ROUTE);
      lookup.resolve('Dune <b>"Part Two"</b>');
      await flush();

      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith(
        'Deleted &quot;Dune &lt;b&gt;&quot;Part Two&quot;&lt;/b&gt;&quot;. ' +
          'Library files, requests and media entry removed.'
      );
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('navigation during deletion', () => {
    it('finishes the confirmed route and only notifies it after navigating away', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      await openRoute();
      await clickDelete();

      navigate(TV_ROUTE);
      deletion.resolve();
      await flush();

      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith(
        'Deleted &quot;Dune&quot;. Library files, requests and media entry removed.'
      );
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
    });

    it('suppresses the pending refresh when navigating during the delay', async () => {
      await openRoute();
      await clickDelete();

      navigate(TV_ROUTE);
      await advanceRefresh();

      expect(Notifier.success).toHaveBeenCalledTimes(1);
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('🗑️ Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('stays silent when the page exits (pagehide) mid-flight without cancelling the deletion', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      await openRoute();
      await clickDelete();

      fakeWindow.dispatch('pagehide');
      deletion.resolve();
      await flush();

      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
    });

    it('suppresses the pending refresh when the page exits during the delay', async () => {
      await openRoute();
      await clickDelete();

      fakeWindow.dispatch('pagehide');
      await advanceRefresh();

      expect(Notifier.success).toHaveBeenCalledTimes(1);
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
