import { BaseClient, IBaseClient } from '../../src/client/base';

// Mock GM.xmlHttpRequest
const mockXmlHttpRequest = jest.fn();
global.GM = {
  xmlHttpRequest: mockXmlHttpRequest,
} as any;

describe('BaseClient', () => {
  let baseClient: IBaseClient;
  const testBaseUrl = 'https://api.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    baseClient = new BaseClient(testBaseUrl);
  });

  describe('constructor', () => {
    it('should create instance with valid base URL', () => {
      const client = new BaseClient('https://test.com');
      expect(client.getBaseUrl()).toBe('https://test.com');
    });

    it('should create instance with empty base URL', () => {
      const client = new BaseClient('');
      expect(client.getBaseUrl()).toBe('');
    });

    it('should create instance with trailing slash base URL', () => {
      const client = new BaseClient('https://test.com/');
      expect(client.getBaseUrl()).toBe('https://test.com/');
    });
  });

  describe('getBaseUrl', () => {
    it('should return the configured base URL', () => {
      expect(baseClient.getBaseUrl()).toBe(testBaseUrl);
    });
  });

  describe('makeRequest', () => {
    it('should make GET request with default headers', async () => {
      const mockResponse = {
        status: 200,
        responseText: '{"data": "test"}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      const result = await (baseClient as any).makeRequest('/test');

      expect(mockXmlHttpRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `${testBaseUrl}/test`,
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
        data: undefined,
        responseType: undefined,
        onload: expect.any(Function),
        onerror: expect.any(Function),
      });

      expect(result).toEqual({ data: 'test' });
    });

    it('should make POST request with custom data and headers', async () => {
      const mockResponse = {
        status: 201,
        responseText: '{"success": true}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      const customHeaders = { Authorization: 'Bearer token' };
      const postData = 'param=value';

      await (baseClient as any).makeRequest('/create', {
        method: 'POST',
        data: postData,
        headers: customHeaders,
      });

      expect(mockXmlHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `${testBaseUrl}/create`,
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: 'Bearer token',
        },
        data: postData,
        responseType: undefined,
        onload: expect.any(Function),
        onerror: expect.any(Function),
      });
    });

    it('should handle text response type correctly', async () => {
      const mockResponse = {
        status: 200,
        responseText: 'plain text response',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      const result = await (baseClient as any).makeRequest('/text', {
        responseType: 'text',
      });

      expect(result).toBe('plain text response');
    });

    it('should handle empty JSON response', async () => {
      const mockResponse = {
        status: 200,
        responseText: '',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      const result = await (baseClient as any).makeRequest('/empty');

      expect(result).toBeNull();
    });

    it('should build correct URL with endpoint', () => {
      const mockResponse = {
        status: 200,
        responseText: '{}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        expect(options.url).toBe(`${testBaseUrl}/api/users`);
        options.onload(mockResponse);
      });

      (baseClient as any).makeRequest('/api/users');
    });

    it('should merge custom headers with default headers', () => {
      const mockResponse = {
        status: 200,
        responseText: '{}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        expect(options.headers).toEqual({
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: 'Bearer test',
        });
        options.onload(mockResponse);
      });

      (baseClient as any).makeRequest('/test', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test',
        },
      });
    });
  });

  describe('error handling', () => {
    it('should reject with error for 400 status code', async () => {
      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
        responseText: 'Invalid parameters',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/error')).rejects.toThrow('400 Bad Request: Invalid parameters');
    });

    it('should reject with error for 404 status code', async () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
        responseText: 'Resource not found',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/notfound')).rejects.toThrow('404 Not Found: Resource not found');
    });

    it('should reject with error for 500 status code', async () => {
      const mockResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        responseText: 'Server error occurred',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/server-error')).rejects.toThrow(
        '500 Internal Server Error: Server error occurred'
      );
    });

    it('should handle network errors via onerror callback', async () => {
      const mockError = {
        statusText: 'Network Error',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onerror(mockError);
      });

      await expect((baseClient as any).makeRequest('/network-fail')).rejects.toThrow('Network error: Network Error');
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        status: 200,
        responseText: '{"invalid": json}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/malformed')).rejects.toThrow('Failed to parse response:');
    });

    it('should handle JSON parsing error gracefully', async () => {
      const mockResponse = {
        status: 200,
        responseText: 'not json at all',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/not-json')).rejects.toThrow('Failed to parse response:');
    });

    it('should handle status code boundary cases', async () => {
      // Test 199 (failure boundary)
      const mockResponse199 = {
        status: 199,
        statusText: 'Information',
        responseText: 'Info response',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse199);
      });

      await expect((baseClient as any).makeRequest('/boundary-199')).rejects.toThrow('199 Information: Info response');

      jest.clearAllMocks();

      // Test 400 (success boundary)
      const mockResponse400 = {
        status: 400,
        statusText: 'Bad Request',
        responseText: 'Client error',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse400);
      });

      await expect((baseClient as any).makeRequest('/boundary-400')).rejects.toThrow('400 Bad Request: Client error');
    });

    it('should handle empty error response', async () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
        responseText: '',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      await expect((baseClient as any).makeRequest('/empty-error')).rejects.toThrow('404 Not Found: ');
    });

    it('should handle undefined statusText in network error', async () => {
      const mockError = {
        statusText: undefined,
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onerror(mockError);
      });

      await expect((baseClient as any).makeRequest('/undefined-status')).rejects.toThrow('Network error: undefined');
    });

    it('should not parse JSON when responseType is text even on error', async () => {
      const mockResponse = {
        status: 200,
        responseText: '{"valid": "json"}',
      };

      mockXmlHttpRequest.mockImplementation((options: any) => {
        options.onload(mockResponse);
      });

      const result = await (baseClient as any).makeRequest('/text-type', {
        responseType: 'text',
      });

      expect(result).toBe('{"valid": "json"}');
    });
  });
});
