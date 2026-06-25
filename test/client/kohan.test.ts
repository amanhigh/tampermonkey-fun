import { KohanClient } from '../../src/client/kohan';

// Mock the BaseClient's makeRequest method
jest.mock('../../src/client/base', () => {
  const originalModule = jest.requireActual('../../src/client/base');
  return {
    ...originalModule,
    BaseClient: class MockBaseClient {
      private baseUrl: string;

      constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
      }

      getBaseUrl(): string {
        return this.baseUrl;
      }

      protected makeRequest = jest.fn();
    },
  };
});

// Test subclass that exposes protected helpers for unit testing
class TestKohanClient extends KohanClient {
  constructor(baseUrl: string = 'https://api.test.com') {
    super(baseUrl);
  }

  // Expose protected methods
  public buildQuery(entries: Array<[string, string | number | boolean | undefined]>): URLSearchParams {
    return super.buildQuery(entries);
  }

  public appendQuery(endpoint: string, query: URLSearchParams): string {
    return super.appendQuery(endpoint, query);
  }

  public async listAllPages<TResponse extends { metadata: { total: number; offset: number; limit: number } }, TItem>(
    endpoint: string,
    filterEntries: Array<[string, string | number | boolean | undefined]>,
    pageLimit: number,
    extractItems: (response: TResponse) => TItem[],
    errorMessage: string
  ): Promise<TItem[]> {
    return super.listAllPages<TResponse, TItem>(endpoint, filterEntries, pageLimit, extractItems, errorMessage);
  }
}

describe('KohanClient', () => {
  let client: TestKohanClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new TestKohanClient();
    mockMakeRequest = (client as any).makeRequest;
  });

  describe('buildQuery', () => {
    it('should skip undefined values', () => {
      const result = client.buildQuery([
        ['a', '1'],
        ['b', undefined],
        ['c', '3'],
      ]);
      expect(result.toString()).toBe('a=1&c=3');
    });

    it('should preserve false boolean values', () => {
      const result = client.buildQuery([
        ['is-fno', false],
      ]);
      expect(result.toString()).toBe('is-fno=false');
    });

    it('should preserve zero numeric values', () => {
      const result = client.buildQuery([
        ['offset', 0],
      ]);
      expect(result.toString()).toBe('offset=0');
    });

    it('should preserve insertion order for stable query strings', () => {
      const result = client.buildQuery([
        ['z', 'last'],
        ['a', 'first'],
        ['m', 'middle'],
      ]);
      // URLSearchParams preserves insertion order
      expect(result.toString()).toBe('z=last&a=first&m=middle');
    });

    it('should return empty URLSearchParams when all values are undefined', () => {
      const result = client.buildQuery([
        ['a', undefined],
        ['b', undefined],
      ]);
      expect(result.toString()).toBe('');
    });

    it('should convert numbers to strings', () => {
      const result = client.buildQuery([
        ['limit', 10],
        ['offset', 0],
      ]);
      expect(result.toString()).toBe('limit=10&offset=0');
    });
  });

  describe('appendQuery', () => {
    it('should return endpoint unchanged for empty query', () => {
      const query = new URLSearchParams();
      expect(client.appendQuery('/tickers', query)).toBe('/tickers');
    });

    it('should append query string when params exist', () => {
      const query = new URLSearchParams();
      query.set('limit', '10');
      query.set('offset', '20');
      expect(client.appendQuery('/tickers', query)).toBe('/tickers?limit=10&offset=20');
    });
  });

  describe('listAllPages', () => {
    it('should fetch one page when total <= limit', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: {
          items: [{ id: 1 }, { id: 2 }],
          metadata: { total: 2, offset: 0, limit: 100 },
        },
      });

      const result = await client.listAllPages<{ items: Array<{ id: number }>; metadata: { total: number; offset: number; limit: number } }, { id: number }>(
        '/items',
        [],
        100,
        (data) => data.items,
        'Failed to list items'
      );

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest).toHaveBeenCalledWith('/items?offset=0&limit=100');
    });

    it('should fetch multiple pages with offset increments', async () => {
      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 1 }, { id: 2 }],
            metadata: { total: 5, offset: 0, limit: 2 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 3 }, { id: 4 }],
            metadata: { total: 5, offset: 2, limit: 2 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 5 }],
            metadata: { total: 5, offset: 4, limit: 2 },
          },
        });

      const result = await client.listAllPages<{ items: Array<{ id: number }>; metadata: { total: number; offset: number; limit: number } }, { id: number }>(
        '/items',
        [],
        2,
        (data) => data.items,
        'Failed to list items'
      );

      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(3);
      expect(mockMakeRequest).toHaveBeenNthCalledWith(1, '/items?offset=0&limit=2');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(2, '/items?offset=2&limit=2');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(3, '/items?offset=4&limit=2');
    });

    it('should map page items using extractItems callback', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: {
          items: [{ name: 'a', value: 1 }, { name: 'b', value: 2 }],
          metadata: { total: 2, offset: 0, limit: 100 },
        },
      });

      const result = await client.listAllPages<
        { items: Array<{ name: string; value: number }>; metadata: { total: number; offset: number; limit: number } },
        string
      >(
        '/items',
        [],
        100,
        (data) => data.items.map((i) => i.name),
        'Failed'
      );

      expect(result).toEqual(['a', 'b']);
    });

    it('should preserve filter entries across pages', async () => {
      mockMakeRequest
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 1 }],
            metadata: { total: 3, offset: 0, limit: 1 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 2 }],
            metadata: { total: 3, offset: 1, limit: 1 },
          },
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: {
            items: [{ id: 3 }],
            metadata: { total: 3, offset: 2, limit: 1 },
          },
        });

      await client.listAllPages<{ items: Array<{ id: number }>; metadata: { total: number; offset: number; limit: number } }, { id: number }>(
        '/items',
        [['type', 'EQUITY'], ['state', 'READY']],
        1,
        (data) => data.items,
        'Failed'
      );

      expect(mockMakeRequest).toHaveBeenCalledTimes(3);
      // All pages must include filter params
      expect(mockMakeRequest).toHaveBeenNthCalledWith(1, '/items?type=EQUITY&state=READY&offset=0&limit=1');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(2, '/items?type=EQUITY&state=READY&offset=1&limit=1');
      expect(mockMakeRequest).toHaveBeenNthCalledWith(3, '/items?type=EQUITY&state=READY&offset=2&limit=1');
    });

    it('should wrap errors with context message', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        client.listAllPages<{ items: Array<{ id: number }>; metadata: { total: number; offset: number; limit: number } }, { id: number }>(
          '/items',
          [],
          100,
          (data) => data.items,
          'Failed to list all items'
        )
      ).rejects.toThrow('Failed to list all items: 500 Internal Server Error');
    });

    it('should return empty array when total is 0', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: {
          items: [],
          metadata: { total: 0, offset: 0, limit: 100 },
        },
      });

      const result = await client.listAllPages<{ items: Array<{ id: number }>; metadata: { total: number; offset: number; limit: number } }, { id: number }>(
        '/items',
        [],
        100,
        (data) => data.items,
        'Failed'
      );

      expect(result).toEqual([]);
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
    });
  });
});
