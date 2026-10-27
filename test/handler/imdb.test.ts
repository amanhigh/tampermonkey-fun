import { ImdbHandler } from '../../src/handler/imdb';

describe('ImdbHandler', () => {
  let openInTabMock: jest.Mock;
  let originalGmDescriptor: PropertyDescriptor | undefined;
  let originalJQueryDescriptor: PropertyDescriptor | undefined;

  const LIST_LINKS = 'a.ipc-title-link-wrapper';

  function mockLinks(hrefs: string[]): void {
    const links = hrefs.map((href) => ({ href })) as unknown as JQuery<HTMLElement>;
    const jqueryMock = jest.fn().mockReturnValue(links);
    Object.defineProperty(globalThis, '$', { configurable: true, value: jqueryMock });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    openInTabMock = jest.fn();
    originalGmDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'GM');
    originalJQueryDescriptor = Object.getOwnPropertyDescriptor(globalThis, '$');
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
    if (originalJQueryDescriptor) {
      Object.defineProperty(globalThis, '$', originalJQueryDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, '$');
    }
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens matching list links in order, first after 4s and then 4s apart, using the existing tab option', () => {
    mockLinks(['https://www.imdb.com/title/tt1/', 'https://www.imdb.com/title/tt2/', 'https://www.imdb.com/title/tt3/']);

    new ImdbHandler().handleListMovies();

    expect($).toHaveBeenCalledWith(LIST_LINKS);

    jest.advanceTimersByTime(3999);
    expect(openInTabMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(openInTabMock).toHaveBeenCalledTimes(1);
    expect(openInTabMock).toHaveBeenNthCalledWith(1, 'https://www.imdb.com/title/tt1/', false);

    jest.advanceTimersByTime(4000);
    expect(openInTabMock).toHaveBeenCalledTimes(2);
    expect(openInTabMock).toHaveBeenNthCalledWith(2, 'https://www.imdb.com/title/tt2/', false);

    jest.advanceTimersByTime(4000);
    expect(openInTabMock).toHaveBeenCalledTimes(3);
    expect(openInTabMock).toHaveBeenNthCalledWith(3, 'https://www.imdb.com/title/tt3/', false);

    jest.advanceTimersByTime(4000);
    expect(openInTabMock).toHaveBeenCalledTimes(3);
  });

  it('opens no tabs when the matching list is empty', () => {
    mockLinks([]);

    new ImdbHandler().handleListMovies();

    jest.advanceTimersByTime(20000);

    expect(openInTabMock).not.toHaveBeenCalled();
  });
});
