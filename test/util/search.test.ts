import { SearchUtil } from '../../src/util/search';

// Mock GM API for Tampermonkey/Greasemonkey environment
const mockGM = {
  openInTab: jest.fn(),
};

// Setup global GM mock
Object.defineProperty(global, 'GM', {
  value: mockGM,
  writable: true,
});

describe('SearchUtil', () => {
  let searchUtil: SearchUtil;

  beforeEach(() => {
    searchUtil = new SearchUtil();
    jest.clearAllMocks();
  });

  describe('youtubeSearch', () => {
    test('should open YouTube search URL with correct query', () => {
      const query = 'javascript tutorials';
      searchUtil.youtubeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        `https://www.youtube.com/results?search_query=${encodeURIComponent('javascript tutorials')}`,
        true
      );
    });

    test('should handle query with special characters', () => {
      const query = 'test & search!';
      searchUtil.youtubeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        `https://www.youtube.com/results?search_query=${encodeURIComponent('test & search!')}`,
        true
      );
    });

    test('should handle empty query string', () => {
      const query = '';
      searchUtil.youtubeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith('https://www.youtube.com/results?search_query=', true);
    });

    test('should handle query with spaces', () => {
      const query = 'multiple word query';
      searchUtil.youtubeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        `https://www.youtube.com/results?search_query=${encodeURIComponent('multiple word query')}`,
        true
      );
    });

    test('should open in background tab', () => {
      const query = 'test';
      searchUtil.youtubeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        expect.any(String),
        true // openInBackground
      );
    });
  });

  describe('ySearch', () => {
    test('should open YTS movies search URL with correct query', () => {
      const query = 'avengers';
      searchUtil.ySearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith('https://yts.mx/browse-movies/avengers', true);
    });

    test('should handle movie titles with spaces', () => {
      const query = 'iron man';
      searchUtil.ySearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(`https://yts.mx/browse-movies/${encodeURIComponent('iron man')}`, true);
    });

    test('should handle special characters in movie titles', () => {
      const query = 'movie-title_2023';
      searchUtil.ySearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith('https://yts.mx/browse-movies/movie-title_2023', true);
    });

    test('should open in background tab', () => {
      const query = 'test';
      searchUtil.ySearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(expect.any(String), true);
    });
  });

  describe('xSearch', () => {
    test('should open 1337x search URL with correct query', () => {
      const query = 'ubuntu iso';
      searchUtil.xSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(`https://www.1337x.to/search/${encodeURIComponent('ubuntu iso')}/1/`, true);
    });

    test('should handle queries with special characters', () => {
      const query = 'software-v1.2.3';
      searchUtil.xSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith('https://www.1337x.to/search/software-v1.2.3/1/', true);
    });

    test('should always search on page 1', () => {
      const query = 'test query';
      searchUtil.xSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(expect.stringContaining('/1/'), true);
    });

    test('should open in background tab', () => {
      const query = 'test';
      searchUtil.xSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(expect.any(String), true);
    });
  });

  describe('xtremeSearch', () => {
    test('should open Airtel Xtreme search URL with correct query', () => {
      const query = 'bollywood movies';
      searchUtil.xtremeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        `https://www.airtelxstream.in/search/${encodeURIComponent('bollywood movies')}?q=${encodeURIComponent('bollywood movies')}`,
        true
      );
    });

    test('should include query in both path and query parameter', () => {
      const query = 'action films';
      searchUtil.xtremeSearch(query);

      const expectedUrl = `https://www.airtelxstream.in/search/${encodeURIComponent('action films')}?q=${encodeURIComponent('action films')}`;
      expect(mockGM.openInTab).toHaveBeenCalledWith(expectedUrl, true);
    });

    test('should handle special characters', () => {
      const query = 'sci-fi & fantasy';
      searchUtil.xtremeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(
        `https://www.airtelxstream.in/search/${encodeURIComponent('sci-fi & fantasy')}?q=${encodeURIComponent('sci-fi & fantasy')}`,
        true
      );
    });

    test('should open in background tab', () => {
      const query = 'test';
      searchUtil.xtremeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(expect.any(String), true);
    });
  });

  describe('bingeSearch', () => {
    test('should open Tata Play Binge search URL with correct query', () => {
      const query = 'web series';
      searchUtil.bingeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(`https://www.tataplaybinge.com/search?q=${encodeURIComponent('web series')}`, true);
    });

    test('should handle movie and series titles', () => {
      const query = 'stranger things';
      searchUtil.bingeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(`https://www.tataplaybinge.com/search?q=${encodeURIComponent('stranger things')}`, true);
    });

    test('should handle special characters in query', () => {
      const query = 'show-name_2023!';
      searchUtil.bingeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith('https://www.tataplaybinge.com/search?q=show-name_2023!', true);
    });

    test('should open in background tab', () => {
      const query = 'test';
      searchUtil.bingeSearch(query);

      expect(mockGM.openInTab).toHaveBeenCalledWith(expect.any(String), true);
    });
  });

  describe('URL construction integrity', () => {
    test('should construct valid YouTube URLs', () => {
      const query = 'test query';
      searchUtil.youtubeSearch(query);

      const calledUrl = mockGM.openInTab.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/www\.youtube\.com\/results\?search_query=.+$/);
    });

    test('should construct valid YTS URLs', () => {
      const query = 'test movie';
      searchUtil.ySearch(query);

      const calledUrl = mockGM.openInTab.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/yts\.mx\/browse-movies\/.+$/);
    });

    test('should construct valid 1337x URLs', () => {
      const query = 'test content';
      searchUtil.xSearch(query);

      const calledUrl = mockGM.openInTab.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/www\.1337x\.to\/search\/.+\/1\/$/);
    });

    test('should construct valid Airtel Xtreme URLs', () => {
      const query = 'test show';
      searchUtil.xtremeSearch(query);

      const calledUrl = mockGM.openInTab.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/www\.airtelxstream\.in\/search\/.+\?q=.+$/);
    });

    test('should construct valid Tata Play Binge URLs', () => {
      const query = 'test content';
      searchUtil.bingeSearch(query);

      const calledUrl = mockGM.openInTab.mock.calls[0][0];
      expect(calledUrl).toMatch(/^https:\/\/www\.tataplaybinge\.com\/search\?q=.+$/);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle null query gracefully', () => {
      expect(() => searchUtil.youtubeSearch(null as any)).not.toThrow();
      expect(mockGM.openInTab).toHaveBeenCalled();
    });

    test('should handle undefined query gracefully', () => {
      expect(() => searchUtil.ySearch(undefined as any)).not.toThrow();
      expect(mockGM.openInTab).toHaveBeenCalled();
    });

    test('should handle numeric query values', () => {
      expect(() => searchUtil.xSearch(123 as any)).not.toThrow();
      expect(mockGM.openInTab).toHaveBeenCalled();
    });

    test('should handle boolean query values', () => {
      expect(() => searchUtil.xtremeSearch(true as any)).not.toThrow();
      expect(mockGM.openInTab).toHaveBeenCalled();
    });

    test('should handle object query values', () => {
      expect(() => searchUtil.bingeSearch({} as any)).not.toThrow();
      expect(mockGM.openInTab).toHaveBeenCalled();
    });
  });

  describe('GM API integration', () => {
    test('should call GM.openInTab exactly once per search method', () => {
      searchUtil.youtubeSearch('test');
      expect(mockGM.openInTab).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      searchUtil.ySearch('test');
      expect(mockGM.openInTab).toHaveBeenCalledTimes(1);
    });

    test('should always use background tab opening', () => {
      const methods = [
        () => searchUtil.youtubeSearch('test'),
        () => searchUtil.ySearch('test'),
        () => searchUtil.xSearch('test'),
        () => searchUtil.xtremeSearch('test'),
        () => searchUtil.bingeSearch('test'),
      ];

      methods.forEach((method) => {
        jest.clearAllMocks();
        method();

        expect(mockGM.openInTab).toHaveBeenCalledWith(
          expect.any(String),
          true // Should always be true for background opening
        );
      });
    });
  });
});
