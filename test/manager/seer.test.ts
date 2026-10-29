import { ISeerClient } from '../../src/client/seer';
import { ISeerManager, SeerManager } from '../../src/manager/seer';
import { ApiError } from '../../src/models/shared/api_error';
import { SeerDeleteTarget, SeerVariant } from '../../src/models/integrations/seer';

/** Build a deletion target with sane defaults for the fields under test. */
function buildTarget(overrides: Partial<SeerDeleteTarget> = {}): SeerDeleteTarget {
  return {
    mediaId: 11,
    variants: [SeerVariant.STANDARD, SeerVariant.FOUR_K],
    requestIds: [21, 22],
    ...overrides,
  };
}

/** Detail route used by the deletion-flow tests. */
const MOVIE_ROUTE = '/movie/603';

describe('SeerManager', () => {
  let manager: ISeerManager;
  let client: jest.Mocked<ISeerClient>;

  beforeEach(() => {
    client = {
      getBaseUrl: jest.fn().mockReturnValue('http://seerr.media.lan/api/v1'),
      getDeleteTarget: jest.fn().mockResolvedValue(buildTarget()),
      hasMediaRecord: jest.fn().mockResolvedValue(true),
      getSearchTitle: jest.fn().mockResolvedValue('Dune'),
      deleteFiles: jest.fn().mockResolvedValue(undefined),
      deleteRequest: jest.fn().mockResolvedValue(undefined),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISeerClient>;

    manager = new SeerManager(client);
  });

  describe('isDetailPage', () => {
    it.each(['/movie/603', '/movie/603/', '/tv/1399', '/tv/1399/season/2'])(
      'accepts the detail route %s',
      (pathname: string) => {
        expect(manager.isDetailPage(pathname)).toBe(true);
      }
    );

    it.each(['/', '/discover', '/collection/603', '/movie/0', '/movie/603x', 'movie/603'])(
      'rejects the unrelated route %s',
      (pathname: string) => {
        expect(manager.isDetailPage(pathname)).toBe(false);
      }
    );
  });

  describe('hasMediaRecord', () => {
    it('delegates the canonical movie route to the client', async () => {
      await expect(manager.hasMediaRecord('/movie/603/')).resolves.toBe(true);

      expect(client.hasMediaRecord).toHaveBeenCalledWith('/movie/603');
    });

    it('canonicalizes a nested tv season route to its media route', async () => {
      client.hasMediaRecord.mockResolvedValue(false);

      await expect(manager.hasMediaRecord('/tv/1399/season/2')).resolves.toBe(false);

      expect(client.hasMediaRecord).toHaveBeenCalledWith('/tv/1399');
    });

    it.each(['/discover', '/movie/0', 'movie/603'])(
      'rejects the unsupported route %s before any client call',
      async (pathname: string) => {
        await expect(manager.hasMediaRecord(pathname)).rejects.toThrow(
          `Unsupported Seer route: ${pathname}`
        );

        expect(client.hasMediaRecord).not.toHaveBeenCalled();
      }
    );

    it('propagates a client failure unchanged', async () => {
      client.hasMediaRecord.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.hasMediaRecord(MOVIE_ROUTE)).rejects.toMatchObject({ status: 500 });
    });

    it('never deletes anything while reading presence', async () => {
      await manager.hasMediaRecord(MOVIE_ROUTE);

      expect(client.getDeleteTarget).not.toHaveBeenCalled();
      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });
  });

  describe('getMediaTitle', () => {
    it('delegates the canonical movie route to the client', async () => {
      await expect(manager.getMediaTitle('/movie/603/')).resolves.toBe('Dune');

      expect(client.getSearchTitle).toHaveBeenCalledWith('/movie/603');
    });

    it('canonicalizes a nested tv season route to its media route', async () => {
      client.getSearchTitle.mockResolvedValue('Game of Thrones');

      await expect(manager.getMediaTitle('/tv/1399/season/2')).resolves.toBe('Game of Thrones');

      expect(client.getSearchTitle).toHaveBeenCalledWith('/tv/1399');
    });

    it.each(['/discover', '/movie/0', 'movie/603'])(
      'rejects the unsupported route %s before any client call',
      async (pathname: string) => {
        await expect(manager.getMediaTitle(pathname)).rejects.toThrow(
          `Unsupported Seer route: ${pathname}`
        );

        expect(client.getSearchTitle).not.toHaveBeenCalled();
      }
    );

    it('propagates a client failure unchanged', async () => {
      client.getSearchTitle.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.getMediaTitle(MOVIE_ROUTE)).rejects.toMatchObject({ status: 500 });
    });

    it('never deletes anything while reading the title', async () => {
      await manager.getMediaTitle(MOVIE_ROUTE);

      expect(client.getDeleteTarget).not.toHaveBeenCalled();
      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });
  });

  describe('deleteMedia', () => {
    it('runs files, then requests, then the media entry for the canonical route', async () => {
      await manager.deleteMedia('/movie/603/');

      expect(client.getDeleteTarget).toHaveBeenCalledWith('/movie/603');
      expect(client.deleteFiles.mock.calls).toEqual([
        [11, SeerVariant.STANDARD],
        [11, SeerVariant.FOUR_K],
      ]);
      expect(client.deleteRequest.mock.calls).toEqual([[21], [22]]);
      expect(client.deleteMedia.mock.calls).toEqual([[11]]);
      expect(client.deleteRequest.mock.invocationCallOrder[1]).toBeLessThan(
        client.deleteMedia.mock.invocationCallOrder[0]
      );
    });

    it('canonicalizes a nested season route to its media route', async () => {
      await manager.deleteMedia('/tv/1399/season/2');

      expect(client.getDeleteTarget).toHaveBeenCalledWith('/tv/1399');
    });

    it.each(['/discover', '/movie/0', 'movie/603'])(
      'rejects the unsupported route %s before any API call',
      async (pathname: string) => {
        await expect(manager.deleteMedia(pathname)).rejects.toThrow(
          `Unsupported Seer route: ${pathname}`
        );

        expect(client.getDeleteTarget).not.toHaveBeenCalled();
        expect(client.deleteFiles).not.toHaveBeenCalled();
        expect(client.deleteRequest).not.toHaveBeenCalled();
        expect(client.deleteMedia).not.toHaveBeenCalled();
      }
    );

    it('resolves a fresh target on every call', async () => {
      client.getDeleteTarget
        .mockResolvedValueOnce(buildTarget({ mediaId: 11, requestIds: [] }))
        .mockResolvedValueOnce(buildTarget({ mediaId: 12, requestIds: [], variants: [] }));

      await manager.deleteMedia(MOVIE_ROUTE);
      await manager.deleteMedia(MOVIE_ROUTE);

      expect(client.getDeleteTarget).toHaveBeenCalledTimes(2);
      expect(client.deleteMedia.mock.calls).toEqual([[11], [12]]);
    });

    it('attempts every variant before reporting a file failure', async () => {
      client.deleteFiles.mockImplementation((_mediaId: number, variant: SeerVariant) =>
        variant === SeerVariant.STANDARD
          ? Promise.reject(new ApiError(500, 'Server Error'))
          : Promise.reject(new ApiError(404, 'Not Found'))
      );

      await expect(manager.deleteMedia(MOVIE_ROUTE)).rejects.toThrow(
        'Seer file deletion failed: standard files: Server Error; 4k files: Not Found'
      );

      expect(client.deleteFiles).toHaveBeenCalledTimes(2);
    });

    it.each([404, 500])('stops before the record cleanup on a %s file failure', async (status) => {
      client.deleteFiles.mockRejectedValue(new ApiError(status, 'File failure'));

      await expect(manager.deleteMedia(MOVIE_ROUTE)).rejects.toThrow('Seer file deletion failed');

      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });

    it('skips the file phase when the target has no variants', async () => {
      client.getDeleteTarget.mockResolvedValue(buildTarget({ variants: [] }));

      await manager.deleteMedia(MOVIE_ROUTE);

      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteMedia).toHaveBeenCalledWith(11);
    });

    it('ignores not-found cleanup responses', async () => {
      client.deleteRequest.mockRejectedValue(new ApiError(404, 'Not Found'));
      client.deleteMedia.mockRejectedValue(new ApiError(404, 'Not Found'));

      await expect(manager.deleteMedia(MOVIE_ROUTE)).resolves.toBeUndefined();
    });

    it('ignores a wrapped not-found cleanup response', async () => {
      const wrapped = new Error('Failed to delete Seer request');
      Object.defineProperty(wrapped, 'cause', { value: new ApiError(404, 'Not Found') });
      client.deleteRequest.mockRejectedValue(wrapped);

      await expect(manager.deleteMedia(MOVIE_ROUTE)).resolves.toBeUndefined();
    });

    it('aggregates record failures after attempting every cleanup step', async () => {
      client.deleteRequest
        .mockRejectedValueOnce(new ApiError(500, 'Server Error'))
        .mockResolvedValueOnce(undefined);
      client.deleteMedia.mockRejectedValue(new ApiError(401, 'Unauthorized'));

      await expect(manager.deleteMedia(MOVIE_ROUTE)).rejects.toThrow(
        'Seer record deletion failed: request 21: Server Error; media 11: Unauthorized'
      );

      expect(client.deleteRequest).toHaveBeenCalledTimes(2);
      expect(client.deleteMedia).toHaveBeenCalledWith(11);
    });

    it('propagates a target resolution failure without deleting anything', async () => {
      client.getDeleteTarget.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.deleteMedia(MOVIE_ROUTE)).rejects.toMatchObject({ status: 500 });

      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });
  });
});
