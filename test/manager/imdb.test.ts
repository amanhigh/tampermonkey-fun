import { ImdbManager } from '../../src/manager/imdb';

describe('ImdbManager', () => {
  let manager: ImdbManager;
  let originalWindowDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    manager = new ImdbManager();
    originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  });

  afterEach(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
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
});
