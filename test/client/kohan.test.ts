import { KohanClient } from '../../src/client/kohan';

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
}

describe('KohanClient', () => {
  let client: TestKohanClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new TestKohanClient();
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
});
