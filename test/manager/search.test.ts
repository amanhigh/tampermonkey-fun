import { ISeerClient } from '../../src/client/seer';
import { ISearchManager, SearchManager } from '../../src/manager/search';
import { ApiError } from '../../src/models/api_error';

/** Detail route used by the search-url tests. */
const MOVIE_ROUTE = '/movie/603';

describe('SearchManager', () => {
  let manager: ISearchManager;
  let client: jest.Mocked<ISeerClient>;

  beforeEach(() => {
    client = {
      getBaseUrl: jest.fn().mockReturnValue('http://seerr.media.lan/api/v1'),
      getDeleteTarget: jest.fn(),
      getSearchTitle: jest.fn().mockResolvedValue('Dune'),
      deleteFiles: jest.fn().mockResolvedValue(undefined),
      deleteRequest: jest.fn().mockResolvedValue(undefined),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISeerClient>;

    manager = new SearchManager(client);
  });

  describe('getXstreamUrl', () => {
    it('builds the Airtel search url from the movie title of the canonical route', async () => {
      client.getSearchTitle.mockResolvedValue('Dune');

      await expect(manager.getXstreamUrl('/movie/603/')).resolves.toBe(
        'https://www.airtelxstream.in/search?q=Dune'
      );

      expect(client.getSearchTitle).toHaveBeenCalledWith('/movie/603');
    });

    it('canonicalizes a nested season route before resolving the title', async () => {
      client.getSearchTitle.mockResolvedValue('Shogun');

      await expect(manager.getXstreamUrl('/tv/1399/season/2')).resolves.toBe(
        'https://www.airtelxstream.in/search?q=Shogun'
      );

      expect(client.getSearchTitle).toHaveBeenCalledWith('/tv/1399');
    });

    it('encodes the resolved title in the query', async () => {
      client.getSearchTitle.mockResolvedValue('Dune: Part Two & More');

      await expect(manager.getXstreamUrl('/movie/603')).resolves.toBe(
        'https://www.airtelxstream.in/search?q=Dune%3A%20Part%20Two%20%26%20More'
      );
    });

    it.each(['/discover', '/movie/0', 'movie/603'])(
      'rejects the unsupported route %s before any API call',
      async (pathname: string) => {
        await expect(manager.getXstreamUrl(pathname)).rejects.toThrow(
          `Unsupported Seer route: ${pathname}`
        );

        expect(client.getSearchTitle).not.toHaveBeenCalled();
      }
    );

    it('deletes nothing while resolving the search url', async () => {
      client.getSearchTitle.mockResolvedValue('Dune');

      await manager.getXstreamUrl(MOVIE_ROUTE);

      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });

    it('propagates a title resolution failure unchanged', async () => {
      client.getSearchTitle.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.getXstreamUrl(MOVIE_ROUTE)).rejects.toMatchObject({ status: 500 });
    });
  });
});
