jest.mock('../../src/core/factory', () => ({
  Factory: { app: { seer: jest.fn() } },
}));

import { Factory } from '../../src/core/factory';
import { RunSeer, SeerApp } from '../../src/core/seer';
import { IGlobalErrorHandler } from '../../src/handler/error';
import { ISeerHandler } from '../../src/handler/seer';

describe('SeerApp startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not start the app when the module is only imported', () => {
    expect(Factory.app.seer).not.toHaveBeenCalled();
  });
});

describe('SeerApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createApp() {
    const seerHandlerMock: jest.Mocked<ISeerHandler> = { initialize: jest.fn() };
    const errorHandlerMock: jest.Mocked<IGlobalErrorHandler> = { registerGlobalErrorHandlers: jest.fn() };
    return { app: new SeerApp(seerHandlerMock, errorHandlerMock), seerHandlerMock, errorHandlerMock };
  }

  it('registers global error handlers before initializing the handler', () => {
    const { app, seerHandlerMock, errorHandlerMock } = createApp();

    app.initialize();

    expect(errorHandlerMock.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(seerHandlerMock.initialize).toHaveBeenCalledTimes(1);
    expect(errorHandlerMock.registerGlobalErrorHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      seerHandlerMock.initialize.mock.invocationCallOrder[0]
    );
  });

  it('does not start the app when only constructed', () => {
    createApp();

    expect(Factory.app.seer).not.toHaveBeenCalled();
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
