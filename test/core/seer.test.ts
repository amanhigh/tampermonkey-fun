jest.mock('../../src/core/factory', () => ({
  Factory: { app: { seer: jest.fn() } },
}));

import { Factory } from '../../src/core/factory';
import { RunSeer, SeerApp } from '../../src/core/seer';
<<<<<<< HEAD
=======
import { IGlobalErrorHandler } from '../../src/handler/error';
>>>>>>> master
import { ISearchHandler } from '../../src/handler/search';
import { ISeerHandler } from '../../src/handler/seer';

/** Origin of the Seerr detail pages. */
const SEERR_ORIGIN = 'http://seerr.media.lan';

/** Origin of the Airtel Xstream search pages. */
const AIRTEL_ORIGIN = 'https://www.airtelxstream.in';

/** Origin unrelated to the userscript. */
const FOREIGN_ORIGIN = 'https://example.test';

<<<<<<< HEAD
/** Pre-existing page error hooks that Seer must leave untouched. */
const pageOnError = jest.fn();
const pageOnUnhandledRejection = jest.fn();
const pageAddEventListener = jest.fn();

/** Window stand-in carrying the origin the app dispatches on and page error hooks. */
const page = {
  location: { origin: SEERR_ORIGIN },
  onerror: pageOnError,
  onunhandledrejection: pageOnUnhandledRejection,
  addEventListener: pageAddEventListener,
};
=======
/** Window stand-in carrying only the origin the app dispatches on. */
const page = { location: { origin: SEERR_ORIGIN } };
>>>>>>> master

/** Install the page double for the duration of the suite. */
function installPage(): void {
  (globalThis as unknown as Record<string, unknown>).window = page;
}

/** Publish the origin the app must dispatch on. */
function visit(origin: string): void {
  page.location.origin = origin;
}

<<<<<<< HEAD
/** Assert that Seer neither replaced nor added global error/rejection hooks. */
function expectPageErrorHooksUntouched(): void {
  expect(page.onerror).toBe(pageOnError);
  expect(page.onunhandledrejection).toBe(pageOnUnhandledRejection);
  expect(pageAddEventListener).not.toHaveBeenCalledWith('error', expect.any(Function));
  expect(pageAddEventListener).not.toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
}

=======
>>>>>>> master
describe('SeerApp startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not start the app when the module is only imported', () => {
    expect(Factory.app.seer).not.toHaveBeenCalled();
  });
});

describe('SeerApp', () => {
  let seerHandler: jest.Mocked<ISeerHandler>;
<<<<<<< HEAD
=======
  let errorHandler: jest.Mocked<IGlobalErrorHandler>;
>>>>>>> master
  let searchHandler: jest.Mocked<ISearchHandler>;
  let app: SeerApp;

  beforeEach(() => {
    jest.clearAllMocks();
    visit(SEERR_ORIGIN);
    installPage();

    seerHandler = { initialize: jest.fn() };
<<<<<<< HEAD
    searchHandler = { searchXstream: jest.fn() };
    app = new SeerApp(seerHandler, searchHandler);
=======
    errorHandler = { registerGlobalErrorHandlers: jest.fn() };
    searchHandler = { searchXstream: jest.fn() };
    app = new SeerApp(seerHandler, errorHandler, searchHandler);
>>>>>>> master
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

<<<<<<< HEAD
  it('initializes the Seerr handler on the Seerr origin', () => {
    app.initialize();

    expect(seerHandler.initialize).toHaveBeenCalledTimes(1);
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
    expectPageErrorHooksUntouched();
  });

  it('arms the Airtel search handler on the Airtel origin', () => {
=======
  it('registers global error handlers before initializing the Seerr handler', () => {
    app.initialize();

    expect(errorHandler.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).toHaveBeenCalledTimes(1);
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
    expect(errorHandler.registerGlobalErrorHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      seerHandler.initialize.mock.invocationCallOrder[0]
    );
  });

  it('registers global error handlers before arming the Airtel search handler', () => {
>>>>>>> master
    visit(AIRTEL_ORIGIN);

    app.initialize();

<<<<<<< HEAD
    expect(searchHandler.searchXstream).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expectPageErrorHooksUntouched();
  });

  it('initializes neither handler on an unrelated origin', () => {
=======
    expect(errorHandler.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(searchHandler.searchXstream).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(errorHandler.registerGlobalErrorHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      searchHandler.searchXstream.mock.invocationCallOrder[0]
    );
  });

  it('initializes neither handler on an unrelated origin but still registers errors', () => {
>>>>>>> master
    visit(FOREIGN_ORIGIN);

    app.initialize();

<<<<<<< HEAD
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
    expectPageErrorHooksUntouched();
=======
    expect(errorHandler.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
>>>>>>> master
  });

  it('selects the handler by exact origin only', () => {
    visit(`${SEERR_ORIGIN}:8448`);
    app.initialize();

    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
<<<<<<< HEAD
    expectPageErrorHooksUntouched();
=======
>>>>>>> master
  });

  it('does not start the app when only constructed', () => {
    expect(Factory.app.seer).not.toHaveBeenCalled();
<<<<<<< HEAD
    expectPageErrorHooksUntouched();
=======
    expect(errorHandler.registerGlobalErrorHandlers).not.toHaveBeenCalled();
>>>>>>> master
  });
});

describe('RunSeer', () => {
  const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    infoSpy.mockRestore();
  });

  it('initializes the factory app', () => {
    const app = { initialize: jest.fn() };
    (Factory.app.seer as jest.Mock).mockReturnValue(app);

    RunSeer();

    expect(infoSpy).toHaveBeenCalledWith('Seer started');
    expect(Factory.app.seer).toHaveBeenCalledTimes(1);
    expect(app.initialize).toHaveBeenCalledTimes(1);
  });
});
