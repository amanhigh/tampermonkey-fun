import { ImdbHandler } from '../../src/handler/imdb';
import { IImdbManager } from '../../src/manager/imdb';

describe('ImdbHandler', () => {
  let imdbManagerMock: jest.Mocked<IImdbManager>;
  let openInTabMock: jest.Mock;
  let originalGmDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    imdbManagerMock = {
      isMovieTab: jest.fn(),
      getMovieTitle: jest.fn().mockReturnValue('Dune: Part Two & More'),
    };
    openInTabMock = jest.fn();
    originalGmDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'GM');
    Object.defineProperty(globalThis, 'GM', {
      configurable: true,
      value: { openInTab: openInTabMock },
    });
  });

  afterEach(() => {
    if (originalGmDescriptor) {
      Object.defineProperty(globalThis, 'GM', originalGmDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'GM');
    }
  });

  it('opens an encoded Airtel Xstream search in a background tab', () => {
    const handler = new ImdbHandler(imdbManagerMock);

    handler.handleXtremeSearch();

    expect(imdbManagerMock.getMovieTitle).toHaveBeenCalledTimes(1);
    expect(openInTabMock).toHaveBeenCalledWith(
      'https://www.airtelxstream.in/search?q=Dune%3A%20Part%20Two%20%26%20More',
      true
    );
  });
});
