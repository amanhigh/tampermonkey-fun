import { SeerHandler } from '../../src/handler/seer';
import { ISeerManager } from '../../src/manager/seer';
import { Constants } from '../../src/models/constant';
import { SeerDeleteTarget, SeerVariant } from '../../src/models/seer';

/** Settle delay the handler waits before resolving a route. */
const SETTLE_MS = 350;

/** Poll interval the handler uses for same-page route changes. */
const POLL_MS = 400;

/** Detail route tracked by most tests. */
const MOVIE_ROUTE = '/movie/603';

/** Other detail route used to simulate same-page navigation. */
const TV_ROUTE = '/tv/1399';

/** Deletion target resolved for the tracked route. */
const TARGET: SeerDeleteTarget = {
  mediaId: 11,
  variants: [SeerVariant.STANDARD],
  requestIds: [21],
};

/** Promise with its resolver kept out of the handler call. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

/** Build a promise that a test resolves when it decides the phase is done. */
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

  createElement(tagName: string): FakeElement {
    return tagName === 'button' ? new FakeButtonElement(this.elements) : new FakeElement(tagName, this.elements);
  }

  getElementById(id: string): FakeElement | undefined {
    return this.elements.get(id);
  }
}

/** Window stand-in carrying the location and listener surface the handler uses. */
class FakeWindow {
  readonly location = { pathname: '/', reload: jest.fn() };
  private readonly listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const bucket = this.listeners.get(type) ?? new Set<() => void>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    [...(this.listeners.get(type) ?? [])].forEach((listener) => listener());
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

/** Publish a browser global without widening the test's own types. */
function installGlobal(name: string, value: unknown): void {
  (globalThis as unknown as Record<string, unknown>)[name] = value;
}

/** Globals replaced by these tests and restored after each case. */
const PATCHED_GLOBALS = ['document', 'window', 'HTMLButtonElement', 'confirm', 'alert'] as const;

describe('SeerHandler', () => {
  let fakeDocument: FakeDocument;
  let fakeWindow: FakeWindow;
  let manager: jest.Mocked<ISeerManager>;
  let handler: SeerHandler;
  let confirmMock: jest.Mock;
  let alertMock: jest.Mock;
  let errorSpy: jest.SpyInstance;
  let savedGlobals: Map<string, PropertyDescriptor | undefined>;

  beforeEach(() => {
    jest.useFakeTimers();

    savedGlobals = new Map(PATCHED_GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

    fakeDocument = new FakeDocument();
    fakeWindow = new FakeWindow();
    fakeWindow.location.pathname = MOVIE_ROUTE;
    confirmMock = jest.fn().mockReturnValue(true);
    alertMock = jest.fn();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    installGlobal('document', fakeDocument);
    installGlobal('window', fakeWindow);
    installGlobal('HTMLButtonElement', FakeButtonElement);
    installGlobal('confirm', confirmMock);
    installGlobal('alert', alertMock);

    manager = {
      getDeleteTarget: jest.fn().mockResolvedValue(TARGET),
      removeFiles: jest.fn().mockResolvedValue([]),
      removeRecords: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISeerManager>;

    handler = new SeerHandler(manager);
  });

  afterEach(() => {
    // Release the handler's timers while the fakes are still installed.
    fakeWindow.dispatch('pagehide');
    jest.useRealTimers();
    errorSpy.mockRestore();
    savedGlobals.forEach((descriptor, name) => {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
        return;
      }
      delete (globalThis as unknown as Record<string, unknown>)[name];
    });
  });

  /** Initialize the handler on the current route and let it settle. */
  async function openRoute(): Promise<void> {
    handler.initialize();
    await jest.advanceTimersByTimeAsync(SETTLE_MS);
    await flush();
  }

  /** Flush the microtasks queued by the handler's async phases. */
  async function flush(): Promise<void> {
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(0);
  }

  /** Read the mounted Delete button, if any. */
  function deleteButton(): FakeButtonElement | undefined {
    return fakeDocument.getElementById(Constants.UI.IDS.SEER.DELETE_BUTTON) as FakeButtonElement | undefined;
  }

  /** Click the mounted Delete button and let the queued work start. */
  async function clickDelete(): Promise<void> {
    deleteButton()?.click();
    await flush();
  }

  /** Simulate a same-page route change followed by the popstate signal. */
  function navigate(pathname: string): void {
    fakeWindow.location.pathname = pathname;
    fakeWindow.dispatch('popstate');
  }

  describe('initialize', () => {
    it('renders the Delete button for a resolved target', async () => {
      await openRoute();

      expect(manager.getDeleteTarget).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('renders nothing when the route has no target', async () => {
      manager.getDeleteTarget.mockResolvedValue(undefined);

      await openRoute();

      expect(manager.getDeleteTarget).toHaveBeenCalledWith(MOVIE_ROUTE);
      expect(deleteButton()).toBeUndefined();
    });

    it('logs a contextual error when the target cannot be resolved', async () => {
      const failure = new Error('Malformed Seer media id');
      manager.getDeleteTarget.mockRejectedValue(failure);

      await openRoute();

      expect(errorSpy).toHaveBeenCalledWith(`Seer: failed to resolve delete target for ${MOVIE_ROUTE}`, failure);
      expect(deleteButton()).toBeUndefined();
    });

    it('ignores a target response that lands after navigation', async () => {
      const stale = defer<SeerDeleteTarget | undefined>();
      manager.getDeleteTarget.mockReturnValueOnce(stale.promise).mockResolvedValue(undefined);

      handler.initialize();
      await jest.advanceTimersByTimeAsync(SETTLE_MS);

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(SETTLE_MS);

      stale.resolve(TARGET);
      await flush();

      expect(manager.getDeleteTarget).toHaveBeenLastCalledWith(TV_ROUTE);
      expect(deleteButton()).toBeUndefined();
    });

    it('removes the panel, listeners and polling when the page is hidden', async () => {
      await openRoute();
      expect(deleteButton()).toBeDefined();

      fakeWindow.dispatch('pagehide');
      await jest.advanceTimersByTimeAsync(POLL_MS * 2);

      expect(deleteButton()).toBeUndefined();
      expect(fakeWindow.listenerCount('popstate')).toBe(0);
      expect(fakeWindow.listenerCount('pagehide')).toBe(0);
      expect(manager.getDeleteTarget).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete flow', () => {
    it('removes files before records and reports each phase on the button', async () => {
      const filePhase = defer<readonly string[]>();
      const recordPhase = defer<readonly string[]>();
      manager.removeFiles.mockReturnValue(filePhase.promise);
      manager.removeRecords.mockReturnValue(recordPhase.promise);

      await openRoute();
      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.removeFiles).toHaveBeenCalledWith(TARGET);
      expect(manager.removeRecords).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Removing files…');
      expect(deleteButton()?.disabled).toBe(true);

      filePhase.resolve([]);
      await flush();

      expect(manager.removeRecords).toHaveBeenCalledWith(TARGET);
      expect(deleteButton()?.textContent).toBe('Removing records…');

      recordPhase.resolve([]);
      await flush();

      expect(manager.removeFiles.mock.invocationCallOrder[0]).toBeLessThan(
        manager.removeRecords.mock.invocationCallOrder[0]
      );
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Seer deletion finished'));
      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the initial confirmation is cancelled', async () => {
      confirmMock.mockReturnValue(false);

      await openRoute();
      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.removeFiles).not.toHaveBeenCalled();
      expect(manager.removeRecords).not.toHaveBeenCalled();
      expect(alertMock).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('ignores duplicate clicks while the files phase is running', async () => {
      const filePhase = defer<readonly string[]>();
      manager.removeFiles.mockReturnValue(filePhase.promise);

      await openRoute();
      await clickDelete();
      await clickDelete();
      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(manager.removeFiles).toHaveBeenCalledTimes(1);

      filePhase.resolve([]);
      await flush();

      expect(manager.removeRecords).toHaveBeenCalledTimes(1);
      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('stops after a cancelled file-failure warning and restores the button', async () => {
      manager.removeFiles.mockResolvedValue(['standard files: Server Error']);
      confirmMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

      await openRoute();
      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(2);
      expect(manager.removeRecords).not.toHaveBeenCalled();
      expect(alertMock).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('continues past a file failure and reports it in the summary', async () => {
      manager.removeFiles.mockResolvedValue(['standard files: Server Error']);
      confirmMock.mockReturnValue(true);

      await openRoute();
      await clickDelete();

      expect(confirmMock).toHaveBeenCalledTimes(2);
      expect(manager.removeRecords).toHaveBeenCalledWith(TARGET);
      expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('1 warning(s)'));
      expect(alertMock.mock.calls[0][0]).toContain('standard files: Server Error');
      expect(fakeWindow.location.reload).toHaveBeenCalledTimes(1);
    });

    it('restores the button and skips the reload on an unexpected failure', async () => {
      manager.removeRecords.mockRejectedValue(new Error('Boom'));

      await openRoute();
      await clickDelete();

      expect(alertMock).toHaveBeenCalledWith('Seer deletion failed: Boom');
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('does not delete when a stale button is clicked before the route poll', async () => {
      await openRoute();

      fakeWindow.location.pathname = TV_ROUTE;
      await clickDelete();

      expect(confirmMock).not.toHaveBeenCalled();
      expect(manager.removeFiles).not.toHaveBeenCalled();
      expect(manager.removeRecords).not.toHaveBeenCalled();
    });
  });

  describe('navigation during deletion', () => {
    it('skips the record phase and stale alerts after navigating', async () => {
      const filePhase = defer<readonly string[]>();
      manager.removeFiles.mockReturnValue(filePhase.promise);

      await openRoute();
      await clickDelete();
      expect(deleteButton()?.textContent).toBe('Removing files…');

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(SETTLE_MS);

      expect(deleteButton()?.disabled).toBe(true);

      filePhase.resolve([]);
      await flush();

      expect(manager.removeRecords).not.toHaveBeenCalled();
      expect(alertMock).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.textContent).toBe('Delete');
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('skips the stale summary and reload after navigating mid-records', async () => {
      const recordPhase = defer<readonly string[]>();
      manager.removeRecords.mockReturnValue(recordPhase.promise);

      await openRoute();
      await clickDelete();
      expect(deleteButton()?.textContent).toBe('Removing records…');

      navigate(TV_ROUTE);
      await jest.advanceTimersByTimeAsync(SETTLE_MS);

      recordPhase.resolve([]);
      await flush();

      expect(alertMock).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
      expect(deleteButton()?.disabled).toBe(false);
    });

    it('stops the record phase when the page is hidden mid-flight', async () => {
      const filePhase = defer<readonly string[]>();
      manager.removeFiles.mockReturnValue(filePhase.promise);

      await openRoute();
      await clickDelete();

      fakeWindow.dispatch('pagehide');
      filePhase.resolve([]);
      await flush();

      expect(manager.removeRecords).not.toHaveBeenCalled();
      expect(alertMock).not.toHaveBeenCalled();
      expect(fakeWindow.location.reload).not.toHaveBeenCalled();
    });
  });
});
