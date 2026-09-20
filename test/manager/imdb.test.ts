import { ImdbManager } from '../../src/manager/imdb';

describe('ImdbManager', () => {
  let manager: ImdbManager;
  let originalWindowDescriptor: PropertyDescriptor | undefined;
  let originalJQueryDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    manager = new ImdbManager();
    originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalJQueryDescriptor = Object.getOwnPropertyDescriptor(globalThis, '$');
  });

  afterEach(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    if (originalJQueryDescriptor) {
      Object.defineProperty(globalThis, '$', originalJQueryDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, '$');
    }
  });

  it.each([
    { pathname: '/title/tt1234567', expected: true },
    { pathname: '/title/tt1234567/reviews', expected: false },
    { pathname: '/title/search', expected: false },
  ])('detects a movie tab for pathname $pathname', ({ pathname, expected }) => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { pathname } },
    });

    expect(manager.isMovieTab()).toBe(expected);
  });

  it('returns the IMDb title without its year', () => {
    const jqueryMock = jest.fn().mockReturnValue({
      text: jest.fn().mockReturnValue('Dune: Part Two (2024)'),
    });
    Object.defineProperty(globalThis, '$', { configurable: true, value: jqueryMock });

    expect(manager.getMovieTitle()).toBe('Dune: Part Two');
    expect(jqueryMock).toHaveBeenCalledWith('h1');
  });
});
