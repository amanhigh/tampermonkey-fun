import { ISeerClient, SeerClient } from '../../src/client/seer';
import { ApiError } from '../../src/models/api_error';
import { Constants } from '../../src/models/constant';
import { SeerVariant } from '../../src/models/seer';

// The inherited BaseClient transport runs on GM.xmlHttpRequest.
const xmlHttpRequestMock = jest.fn();
(global as any).GM = { xmlHttpRequest: xmlHttpRequestMock };

/** Answer the next transport call with a JSON body (or an empty one). */
function respondWith(body: unknown, status = 200): void {
  xmlHttpRequestMock.mockImplementation((options: any) => {
    options.onload({
      status,
      statusText: '',
      responseText: body === undefined ? '' : JSON.stringify(body),
    });
  });
}

/** Fail the next transport call at the network level. */
function failNetwork(statusText: string): void {
  xmlHttpRequestMock.mockImplementation((options: any) => {
    options.onerror({ statusText });
  });
}

/** Options handed to the most recent transport call. */
function lastRequest(): { method: string; url: string; headers: Record<string, string> } {
  const calls = xmlHttpRequestMock.mock.calls;
  return calls[calls.length - 1][0];
}

describe('SeerClient', () => {
  let client: ISeerClient;

  beforeEach(() => {
    xmlHttpRequestMock.mockReset();
    client = new SeerClient();
  });

  describe('getBaseUrl', () => {
    it('defaults to the Seerr API base url from constants', () => {
      expect(client.getBaseUrl()).toBe(Constants.SEER.BASE_URL);
      expect(client.getBaseUrl()).toBe('http://seerr.media.lan/api/v1');
    });

    it('accepts an explicit base url', () => {
      expect(new SeerClient('http://example.test/api/v1').getBaseUrl()).toBe(
        'http://example.test/api/v1'
      );
    });
  });

  describe('getDeleteTarget', () => {
    it('reads the canonical movie detail endpoint', async () => {
      respondWith({ mediaInfo: { id: 11, requests: [{ id: 21, is4k: false }] } });

      const target = await client.getDeleteTarget('/movie/603');

      const request = lastRequest();
      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://seerr.media.lan/api/v1/movie/603');
      expect(target).toEqual({
        mediaId: 11,
        variants: [SeerVariant.STANDARD],
        requestIds: [21],
      });
    });

    it('reads the canonical tv detail endpoint', async () => {
      respondWith({ mediaInfo: { id: 7, requests: [] } });

      const target = await client.getDeleteTarget('/tv/1399');

      expect(lastRequest().url).toBe('http://seerr.media.lan/api/v1/tv/1399');
      expect(target).toEqual({ mediaId: 7, variants: [], requestIds: [] });
    });

    it('infers STANDARD from standard service metadata only', async () => {
      respondWith({
        mediaInfo: { id: 3, serviceUrl: 'https://radarr/movie/3', title: 'Ignored' },
      });

      const target = await client.getDeleteTarget('/movie/12');

      expect(target.variants).toEqual([SeerVariant.STANDARD]);
      expect(target.requestIds).toEqual([]);
    });

    it('ignores an empty service url as variant evidence', async () => {
      respondWith({ mediaInfo: { id: 9, serviceUrl: '', serviceUrl4k: '' } });

      const target = await client.getDeleteTarget('/movie/12');

      expect(target).toEqual({ mediaId: 9, variants: [], requestIds: [] });
    });

    it('infers FOUR_K from 4k service metadata and 4k requests', async () => {
      respondWith({
        mediaInfo: {
          id: 4,
          externalServiceId4k: 99,
          requests: [{ id: 8, is4k: true }],
        },
      });

      const target = await client.getDeleteTarget('/movie/12');

      expect(target.variants).toEqual([SeerVariant.FOUR_K]);
      expect(target.requestIds).toEqual([8]);
    });

    it('infers both variants and dedupes request ids', async () => {
      respondWith({
        mediaInfo: {
          id: 5,
          serviceId: 1,
          requests: [
            { id: 41, is4k: false },
            { id: 41, is4k: false },
            { id: 42, is4k: true },
            { id: 42, is4k: true },
          ],
        },
      });

      const target = await client.getDeleteTarget('/tv/1399');

      expect(target).toEqual({
        mediaId: 5,
        variants: [SeerVariant.STANDARD, SeerVariant.FOUR_K],
        requestIds: [41, 42],
      });
    });

    it('returns empty arrays when the media has no service or request metadata', async () => {
      respondWith({ mediaInfo: { id: 6 } });

      const target = await client.getDeleteTarget('/movie/12');

      expect(target).toEqual({ mediaId: 6, variants: [], requestIds: [] });
    });

    it('treats missing requests as an empty collection and keeps serviceId 0 as STANDARD evidence', async () => {
      respondWith({ mediaInfo: { id: 6, serviceId: 0 } });

      const target = await client.getDeleteTarget('/movie/12');

      expect(target).toEqual({ mediaId: 6, variants: [SeerVariant.STANDARD], requestIds: [] });
    });

    it('rejects when mediaInfo is absent', async () => {
      respondWith({ title: 'Seer detail' });

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow(
        'No Seer media record for /movie/12'
      );
    });

    it('rejects when mediaInfo is null', async () => {
      respondWith({ mediaInfo: null });

      await expect(client.getDeleteTarget('/tv/1')).rejects.toThrow(
        'No Seer media record for /tv/1'
      );
    });

    it('rejects a non numeric media id', async () => {
      respondWith({ mediaInfo: { id: '11' } });

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow('Malformed Seer media id');
    });

    it('rejects a non positive media id', async () => {
      respondWith({ mediaInfo: { id: 0 } });

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow('Invalid Seer media id: 0');
    });

    it('rejects a malformed requests collection', async () => {
      respondWith({ mediaInfo: { id: 1, requests: {} } });

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow('Malformed Seer requests');
    });

    it('rejects a request without a positive id', async () => {
      respondWith({ mediaInfo: { id: 1, requests: [{ id: -2, is4k: false }] } });

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow(
        'Invalid Seer request id: -2'
      );
    });

    it('rejects a payload that is not an object', async () => {
      respondWith([1, 2, 3]);

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow(
        'Malformed Seer detail response'
      );
    });

    it('preserves the HTTP status of a failing detail request', async () => {
      respondWith({ message: 'Not Found' }, 404);

      const error = await client.getDeleteTarget('/movie/12').catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
    });

    it('propagates a network failure unchanged', async () => {
      failNetwork('Network down');

      await expect(client.getDeleteTarget('/movie/12')).rejects.toThrow(
        'Network error: Network down'
      );
    });
  });

  describe('getSearchTitle', () => {
    it('reads the movie title from the canonical detail endpoint', async () => {
      respondWith({ mediaInfo: { id: 11 }, title: 'Dune: Part Two', originalTitle: 'Dune 2' });

      const title = await client.getSearchTitle('/movie/603');

      const request = lastRequest();
      expect(request.method).toBe('GET');
      expect(request.url).toBe('http://seerr.media.lan/api/v1/movie/603');
      expect(title).toBe('Dune: Part Two');
    });

    it('falls back to the movie original title when the title is absent', async () => {
      respondWith({ originalTitle: 'Sen to Chihiro' });

      await expect(client.getSearchTitle('/movie/129')).resolves.toBe('Sen to Chihiro');
    });

    it('falls back to the movie original title when the title is blank or non-string', async () => {
      respondWith({ title: '   ', originalTitle: 'Fallen' });

      await expect(client.getSearchTitle('/movie/1')).resolves.toBe('Fallen');

      respondWith({ title: 42, originalTitle: 'Fallen' });

      await expect(client.getSearchTitle('/movie/1')).resolves.toBe('Fallen');
    });

    it('trims the decoded title', async () => {
      respondWith({ title: '  Shogun  ' });

      await expect(client.getSearchTitle('/movie/1')).resolves.toBe('Shogun');
    });

    it('reads the tv name from the canonical detail endpoint', async () => {
      respondWith({ name: 'Shogun', originalName: 'Shōgun' });

      const title = await client.getSearchTitle('/tv/1399');

      expect(lastRequest().url).toBe('http://seerr.media.lan/api/v1/tv/1399');
      expect(title).toBe('Shogun');
    });

    it('falls back to the tv original name through blanks and non-strings', async () => {
      respondWith({ name: ' ', originalName: 'Shōgun' });

      await expect(client.getSearchTitle('/tv/1399')).resolves.toBe('Shōgun');

      respondWith({ name: null, originalName: 'Shōgun' });

      await expect(client.getSearchTitle('/tv/1399')).resolves.toBe('Shōgun');
    });

    it('ignores mediaInfo and other detail metadata', async () => {
      respondWith({ mediaInfo: { id: 5, title: 'Ignored' }, title: 'Dune' });

      await expect(client.getSearchTitle('/movie/603')).resolves.toBe('Dune');
    });

    it('rejects a detail response without any usable title', async () => {
      respondWith({ mediaInfo: { id: 9 } });

      await expect(client.getSearchTitle('/movie/603')).rejects.toThrow(
        'No Seer title for /movie/603'
      );
    });

    it('rejects when every title alternative is blank or non-string', async () => {
      respondWith({ title: '', originalTitle: { name: 'Dune' } });

      await expect(client.getSearchTitle('/movie/603')).rejects.toThrow(
        'No Seer title for /movie/603'
      );
    });

    it('rejects a tv response that only carries the movie title fields', async () => {
      respondWith({ title: 'Dune', originalTitle: 'Dune 2' });

      await expect(client.getSearchTitle('/tv/1399')).rejects.toThrow(
        'No Seer title for /tv/1399'
      );
    });

    it('rejects a title payload that is not an object', async () => {
      respondWith('Dune');

      await expect(client.getSearchTitle('/movie/603')).rejects.toThrow(
        'Malformed Seer detail response'
      );
    });

    it('preserves the HTTP status of a failing detail request', async () => {
      respondWith({ message: 'Not Found' }, 404);

      await expect(client.getSearchTitle('/movie/603')).rejects.toBeInstanceOf(ApiError);
    });

    it('propagates a network failure unchanged', async () => {
      failNetwork('Network down');

      await expect(client.getSearchTitle('/movie/603')).rejects.toThrow(
        'Network error: Network down'
      );
    });
  });

  describe('deleteFiles', () => {
    it('deletes standard files with is4k=false', async () => {
      respondWith(undefined, 204);

      await expect(client.deleteFiles(42, SeerVariant.STANDARD)).resolves.toBeUndefined();

      const request = lastRequest();
      expect(request.method).toBe('DELETE');
      expect(request.url).toBe('http://seerr.media.lan/api/v1/media/42/file?is4k=false');
    });

    it('deletes 4k files with is4k=true', async () => {
      respondWith(undefined, 204);

      await client.deleteFiles(42, SeerVariant.FOUR_K);

      expect(lastRequest().url).toBe('http://seerr.media.lan/api/v1/media/42/file?is4k=true');
    });

    it('rejects an invalid media id without calling the API', async () => {
      await expect(client.deleteFiles(1.5, SeerVariant.STANDARD)).rejects.toThrow(
        'Invalid Seer media id: 1.5'
      );
      expect(xmlHttpRequestMock).not.toHaveBeenCalled();
    });

    it('preserves the HTTP status of a failing deletion', async () => {
      respondWith({ message: 'Server Error' }, 500);

      await expect(client.deleteFiles(42, SeerVariant.STANDARD)).rejects.toMatchObject({
        status: 500,
      });
    });

    it('propagates a network failure unchanged', async () => {
      failNetwork('Network down');

      await expect(client.deleteFiles(42, SeerVariant.STANDARD)).rejects.toThrow(
        'Network error: Network down'
      );
    });
  });

  describe('deleteRequest', () => {
    it('deletes the request by id', async () => {
      respondWith(undefined, 204);

      await client.deleteRequest(7);

      const request = lastRequest();
      expect(request.method).toBe('DELETE');
      expect(request.url).toBe('http://seerr.media.lan/api/v1/request/7');
    });

    it('returns the API error message with its status', async () => {
      respondWith({ message: 'Request not found' }, 404);

      const error = await client.deleteRequest(7).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).message).toBe('{"message":"Request not found"}');
    });

    it('rejects an invalid request id', async () => {
      await expect(client.deleteRequest(0)).rejects.toThrow('Invalid Seer request id: 0');
      expect(xmlHttpRequestMock).not.toHaveBeenCalled();
    });
  });

  describe('deleteMedia', () => {
    it('deletes the media entry', async () => {
      respondWith(undefined, 204);

      await client.deleteMedia(42);

      const request = lastRequest();
      expect(request.method).toBe('DELETE');
      expect(request.url).toBe('http://seerr.media.lan/api/v1/media/42');
    });

    it('propagates a network failure unchanged', async () => {
      failNetwork('Network down');

      await expect(client.deleteMedia(42)).rejects.toThrow('Network error: Network down');
    });
  });
});
