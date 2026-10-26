import { ISeerClient } from '../../src/client/seer';
import { ISeerManager, SeerManager } from '../../src/manager/seer';
import { ApiError } from '../../src/models/api_error';
import { SeerDeleteTarget, SeerVariant } from '../../src/models/seer';

/** Build a deletion target with sane defaults for the fields under test. */
function buildTarget(overrides: Partial<SeerDeleteTarget> = {}): SeerDeleteTarget {
  return {
    mediaId: 11,
    variants: [SeerVariant.STANDARD, SeerVariant.FOUR_K],
    requestIds: [21, 22],
    ...overrides,
  };
}

describe('SeerManager', () => {
  let manager: ISeerManager;
  let client: jest.Mocked<ISeerClient>;

  beforeEach(() => {
    client = {
      getBaseUrl: jest.fn().mockReturnValue('http://seerr.media.lan/api/v1'),
      getDeleteTarget: jest.fn(),
      deleteFiles: jest.fn().mockResolvedValue(undefined),
      deleteRequest: jest.fn().mockResolvedValue(undefined),
      deleteMedia: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISeerClient>;

    manager = new SeerManager(client);
  });

  describe('getDeleteTarget', () => {
    it('forwards the canonical path of a movie route', async () => {
      client.getDeleteTarget.mockResolvedValue(buildTarget());

      const target = await manager.getDeleteTarget('/movie/603/');

      expect(client.getDeleteTarget).toHaveBeenCalledWith('/movie/603');
      expect(target).toEqual(buildTarget());
    });

    it('forwards the canonical path of a tv route', async () => {
      client.getDeleteTarget.mockResolvedValue(undefined);

      await manager.getDeleteTarget('/tv/1399');

      expect(client.getDeleteTarget).toHaveBeenCalledWith('/tv/1399');
    });

    it('canonicalizes a nested season route to its media route', async () => {
      client.getDeleteTarget.mockResolvedValue(undefined);

      await manager.getDeleteTarget('/tv/1399/season/2');

      expect(client.getDeleteTarget).toHaveBeenCalledWith('/tv/1399');
    });

    it.each(['/', '/discover', '/collection/603', '/movie/0', '/movie/603x', 'movie/603'])(
      'skips the unrelated route %s without calling the client',
      async (pathname: string) => {
        await expect(manager.getDeleteTarget(pathname)).resolves.toBeUndefined();
        expect(client.getDeleteTarget).not.toHaveBeenCalled();
      }
    );

    it('propagates a client failure', async () => {
      client.getDeleteTarget.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.getDeleteTarget('/movie/603')).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('removeFiles', () => {
    it('attempts every variant in order and reports no failures', async () => {
      const failures = await manager.removeFiles(buildTarget());

      expect(failures).toEqual([]);
      expect(client.deleteFiles.mock.calls).toEqual([
        [11, SeerVariant.STANDARD],
        [11, SeerVariant.FOUR_K],
      ]);
    });

    it('collects a failure for every variant that could not be deleted', async () => {
      client.deleteFiles.mockImplementation((_mediaId: number, variant: SeerVariant) =>
        variant === SeerVariant.STANDARD
          ? Promise.reject(new ApiError(500, 'Server Error'))
          : Promise.reject(new ApiError(404, 'Not Found'))
      );

      const failures = await manager.removeFiles(buildTarget());

      expect(client.deleteFiles).toHaveBeenCalledTimes(2);
      expect(failures).toEqual(['standard files: Server Error', '4k files: Not Found']);
    });

    it('treats a 404 file failure as a failure', async () => {
      client.deleteFiles.mockRejectedValue(new ApiError(404, 'Not Found'));

      const failures = await manager.removeFiles(buildTarget({ variants: [SeerVariant.FOUR_K] }));

      expect(failures).toEqual(['4k files: Not Found']);
    });

    it('makes no calls when the target has no variants', async () => {
      await expect(manager.removeFiles(buildTarget({ variants: [] }))).resolves.toEqual([]);
      expect(client.deleteFiles).not.toHaveBeenCalled();
    });
  });

  describe('removeRecords', () => {
    it('deletes requests first and the media entry last', async () => {
      const failures = await manager.removeRecords(buildTarget());

      expect(failures).toEqual([]);
      expect(client.deleteRequest.mock.calls).toEqual([[21], [22]]);
      expect(client.deleteMedia.mock.calls).toEqual([[11]]);
      expect(client.deleteRequest.mock.invocationCallOrder[1]).toBeLessThan(
        client.deleteMedia.mock.invocationCallOrder[0]
      );
    });

    it('deletes only the media entry when the target has no requests', async () => {
      await manager.removeRecords(buildTarget({ requestIds: [] }));

      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).toHaveBeenCalledWith(11);
    });

    it('ignores not-found responses', async () => {
      client.deleteRequest.mockRejectedValue(new ApiError(404, 'Not Found'));
      client.deleteMedia.mockRejectedValue(new ApiError(404, 'Not Found'));

      await expect(manager.removeRecords(buildTarget())).resolves.toEqual([]);
    });

    it('unwraps a wrapped not-found response', async () => {
      const wrapped = new Error('Failed to delete Seer request');
      Object.defineProperty(wrapped, 'cause', { value: new ApiError(404, 'Not Found') });
      client.deleteRequest.mockRejectedValue(wrapped);

      await expect(manager.removeRecords(buildTarget())).resolves.toEqual([]);
    });

    it('collects other failures and keeps deleting the remaining steps', async () => {
      client.deleteRequest
        .mockRejectedValueOnce(new ApiError(500, 'Server Error'))
        .mockResolvedValueOnce(undefined);
      client.deleteMedia.mockRejectedValue(new ApiError(401, 'Unauthorized'));

      const failures = await manager.removeRecords(buildTarget());

      expect(client.deleteRequest).toHaveBeenCalledTimes(2);
      expect(client.deleteMedia).toHaveBeenCalledWith(11);
      expect(failures).toEqual([
        'request 21: Server Error',
        'media 11: Unauthorized',
      ]);
    });
  });
});
