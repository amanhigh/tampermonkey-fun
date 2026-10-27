jest.mock('../../src/core/factory', () => ({
  Factory: { app: { seer: jest.fn() } },
}));

import { Factory } from '../../src/core/factory';
import { RunSeer, SeerApp } from '../../src/core/seer';
import { IGlobalErrorHandler } from '../../src/handler/error';
import { ISearchHandler } from '../../src/handler/search';
import { ISeerHandler } from '../../src/handler/seer';

/** Origin of the Seerr detail pages. */
const SEERR_ORIGIN = 'http://seerr.media.lan';

/** Origin of the Airtel Xstream search pages. */
const AIRTEL_ORIGIN = 'https://www.airtelxstream.in';

/** Origin unrelated to the userscript. */
const FOREIGN_ORIGIN = 'https://example.test';

/** Window stand-in carrying only the origin the app dispatches on. */
const page = { location: { origin: SEERR_ORIGIN } };

/** Install the page double for the duration of the suite. */
function installPage(): void {
  (globalThis as unknown as Record<string, unknown>).window = page;
}

/** Publish the origin the app must dispatch on. */
function visit(origin: string): void {
  page.location.origin = origin;
}

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
  let errorHandler: jest.Mocked<IGlobalErrorHandler>;
  let searchHandler: jest.Mocked<ISearchHandler>;
  let app: SeerApp;

  beforeEach(() => {
    jest.clearAllMocks();
    visit(SEERR_ORIGIN);
    installPage();

    seerHandler = { initialize: jest.fn() };
    errorHandler = { registerGlobalErrorHandlers: jest.fn() };
    searchHandler = { searchXstream: jest.fn() };
    app = new SeerApp(seerHandler, errorHandler, searchHandler);
  });

  afterEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

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
    visit(AIRTEL_ORIGIN);

    app.initialize();

    expect(errorHandler.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(searchHandler.searchXstream).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(errorHandler.registerGlobalErrorHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      searchHandler.searchXstream.mock.invocationCallOrder[0]
    );
  });

  it('initializes neither handler on an unrelated origin but still registers errors', () => {
    visit(FOREIGN_ORIGIN);

    app.initialize();

    expect(errorHandler.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
  });

  it('selects the handler by exact origin only', () => {
    visit(`${SEERR_ORIGIN}:8448`);
    app.initialize();

    expect(seerHandler.initialize).not.toHaveBeenCalled();
    expect(searchHandler.searchXstream).not.toHaveBeenCalled();
  });

  it('does not start the app when only constructed', () => {
    expect(Factory.app.seer).not.toHaveBeenCalled();
    expect(errorHandler.registerGlobalErrorHandlers).not.toHaveBeenCalled();
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
