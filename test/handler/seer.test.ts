import { SeerHandler } from '../../src/handler/seer';
import { ISeerManager } from '../../src/manager/seer';
import { Constants } from '../../src/models/constant';

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
}

/** Build a promise that a test settles when it decides the deletion is done. */
function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
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
const PATCHED_GLOBALS = ['document', 'window', 'HTMLButtonElement', 'confirm'] as const;

describe('SeerHandler', () => {
  let fakeDocument: FakeDocument;
  let fakeWindow: FakeWindow;
  let manager: jest.Mocked<ISeerManager>;
  let handler: SeerHandler;
  let confirmMock: jest.Mock;
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

    installGlobal('document', fakeDocument);
    installGlobal('window', fakeWindow);
    installGlobal('HTMLButtonElement', FakeButtonElement);
    installGlobal('confirm', confirmMock);

    manager = {
      isDetailPage: jest.fn().mockImplementation((pathname: string) => pathname !== UNSUPPORTED_ROUTE),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(Notifier.success).mockClear();
    jest.mocked(Notifier.error).mockClear();

    handler = new SeerHandler(manager);
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

  /** Initialize the handler on the current route. */
  function openRoute(): void {
    handler.initialize();
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
    it('mounts the Delete button once', () => {
      openRoute();
      openRoute();

      expect(fakeDocument.createdWithTag('div')).toHaveLength(1);
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('shows the panel only on detail routes', async () => {
      openRoute();
      expect(panel()?.hidden).toBe(false);

      navigate(UNSUPPORTED_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(panel()?.hidden).toBe(true);

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(POLL_MS);

      expect(panel()?.hidden).toBe(false);
      expect(manager.deleteMedia).not.toHaveBeenCalled();
    });

    it('hides the panel on an unsupported route before the first poll', () => {
      fakeWindow.location.pathname = UNSUPPORTED_ROUTE;

      openRoute();

      expect(panel()?.hidden).toBe(true);
    });

    it('removes the panel and stops polling when the page exits', () => {
      openRoute();
      expect(jest.getTimerCount()).toBe(1);

      fakeWindow.dispatch('pagehide');

      expect(panel()).toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('delete flow', () => {
    it('deletes the captured route once and refreshes it after the delay', async () => {
      openRoute();

      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(confirmMock.mock.calls[0][0]).toContain('cannot be undone');
      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith('Seer deletion finished for /movie/603. The page will refresh.');
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('keeps the button busy until the pending refresh runs', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      openRoute();

      deleteButton()?.click();

      expect(deleteButton()?.textContent).toBe('Deleting…');
      expect(deleteButton()?.disabled).toBe(true);

      deletion.resolve();
      await flush();

      expect(deleteButton()?.textContent).toBe('Deleting…');
      expect(deleteButton()?.disabled).toBe(true);

      await advanceRefresh();

      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('does nothing when the confirmation is cancelled', async () => {
      confirmMock.mockReturnValue(false);
      openRoute();

      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).not.toHaveBeenCalled();
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(Notifier.error).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
    });

    it('ignores duplicate clicks while the deletion and its refresh are running', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      openRoute();

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
      openRoute();
      navigate(UNSUPPORTED_ROUTE);

      await clickDelete();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.deleteMedia).not.toHaveBeenCalled();
    });

    it('deletes the live route captured at click, before the next poll', async () => {
      openRoute();
      navigate(TV_ROUTE);

      await clickDelete();
      await advanceRefresh();

      expect(manager.deleteMedia).toHaveBeenCalledWith(TV_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith('Seer deletion finished for /tv/1399. The page will refresh.');
      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('notifies a failure with escaped HTML for eight seconds and never reloads', async () => {
      manager.deleteMedia.mockRejectedValue(new Error('Seer file deletion failed: <b>4k</b> "files"'));
      openRoute();

      await clickDelete();

      expect(Notifier.error).toHaveBeenCalledWith(expect.stringContaining('Seer deletion failed for /movie/603'), FAILURE_TIMEOUT_MS);
      const message = jest.mocked(Notifier.error).mock.calls[0][0];
      expect(message).not.toContain('<b>');
      expect(message).toContain('&lt;b&gt;4k&lt;/b&gt;');
      expect(message).toContain('&quot;files&quot;');
      expect(Notifier.success).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });
  });

  describe('navigation during deletion', () => {
    it('finishes the confirmed route and only notifies it after navigating away', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      openRoute();
      await clickDelete();

      navigate(TV_ROUTE);
      deletion.resolve();
      await flush();

      expect(manager.deleteMedia).toHaveBeenCalledTimes(1);
      expect(manager.deleteMedia).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(Notifier.success).toHaveBeenCalledWith('Seer deletion finished for /movie/603.');
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();

      await advanceRefresh();

      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
    });

    it('suppresses the pending refresh when navigating during the delay', async () => {
      openRoute();
      await clickDelete();

      navigate(TV_ROUTE);
      await advanceRefresh();

      expect(Notifier.success).toHaveBeenCalledTimes(1);
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('stays silent when the page exits (pagehide) mid-flight without cancelling the deletion', async () => {
      const deletion = defer<void>();
      manager.deleteMedia.mockReturnValue(deletion.promise);
      openRoute();
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
      openRoute();
      await clickDelete();

      fakeWindow.dispatch('pagehide');
      await advanceRefresh();

      expect(Notifier.success).toHaveBeenCalledTimes(1);
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
