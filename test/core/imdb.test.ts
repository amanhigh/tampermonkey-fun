jest.mock('../../src/core/factory', () => ({
  Factory: { app: { imdb: jest.fn() } },
}));

import { ImdbApp } from '../../src/core/imdb';
import { IImdbHandler } from '../../src/handler/imdb';
import { IGlobalErrorHandler } from '../../src/handler/error';
import { IImdbManager } from '../../src/manager/imdb';

describe('ImdbApp', () => {
  let originalGmDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalGmDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'GM');
  });

  afterEach(() => {
    if (originalGmDescriptor) {
      Object.defineProperty(globalThis, 'GM', originalGmDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'GM');
    }
  });

  function createApp(isMovieTab: boolean) {
    const imdbHandlerMock: jest.Mocked<IImdbHandler> = {
      handleListMovies: jest.fn(),
      handleXtremeSearch: jest.fn(),
    };
    const imdbManagerMock: jest.Mocked<IImdbManager> = {
      isMovieTab: jest.fn().mockReturnValue(isMovieTab),
      getMovieTitle: jest.fn(),
    };
    const errorHandlerMock: jest.Mocked<IGlobalErrorHandler> = {
      registerGlobalErrorHandlers: jest.fn(),
    };
    const registerMenuCommandMock = jest.fn();
    Object.defineProperty(globalThis, 'GM', {
      configurable: true,
      value: { registerMenuCommand: registerMenuCommandMock },
    });

    return {
      app: new ImdbApp(imdbHandlerMock, imdbManagerMock, errorHandlerMock),
      imdbHandlerMock,
      errorHandlerMock,
      registerMenuCommandMock,
    };
  }

  it('registers only Xtreme on title pages and delegates its action', () => {
    const { app, imdbHandlerMock, errorHandlerMock, registerMenuCommandMock } = createApp(true);

    app.initialize();

    expect(errorHandlerMock.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(registerMenuCommandMock).toHaveBeenCalledTimes(1);
    expect(registerMenuCommandMock).toHaveBeenCalledWith('Xtreme', expect.any(Function));
    const action = registerMenuCommandMock.mock.calls[0][1] as () => void;
    action();
    expect(imdbHandlerMock.handleXtremeSearch).toHaveBeenCalledTimes(1);
  });

  it('registers only List on non-title pages and delegates its action', () => {
    const { app, imdbHandlerMock, registerMenuCommandMock } = createApp(false);

    app.initialize();

    expect(registerMenuCommandMock).toHaveBeenCalledTimes(1);
    expect(registerMenuCommandMock).toHaveBeenCalledWith('List', expect.any(Function));
    const action = registerMenuCommandMock.mock.calls[0][1] as () => void;
    action();
    expect(imdbHandlerMock.handleListMovies).toHaveBeenCalledTimes(1);
  });
});
