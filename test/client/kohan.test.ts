import { KohanClient, IKohanClient } from '../../src/client/kohan';

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

describe('KohanClient', () => {
  let kohanClient: IKohanClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    kohanClient = new KohanClient();
    mockMakeRequest = (kohanClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new KohanClient();
      expect(client.getBaseUrl()).toBe('http://localhost:9010/v1');
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/api';
      const client = new KohanClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('recordTicker', () => {
    it('should record ticker successfully', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.recordTicker('AAPL');

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/AAPL/record');
    });

    it('should handle ticker with special characters', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const specialTicker = 'BRK.A';
      await kohanClient.recordTicker(specialTicker);

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/BRK.A/record');
    });

    it('should handle ticker with numbers', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const numericTicker = 'STOCK123';
      await kohanClient.recordTicker(numericTicker);

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/STOCK123/record');
    });

    it('should handle ticker with hyphens and underscores', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const hyphenatedTicker = 'TEST-STOCK_ABC';
      await kohanClient.recordTicker(hyphenatedTicker);

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/TEST-STOCK_ABC/record');
    });

    it('should handle empty ticker string', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.recordTicker('');

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker//record');
    });

    it('should handle long ticker names', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const longTicker = 'VERYLONGTICKERNAMETHATSHOULDSTILLWORK';
      await kohanClient.recordTicker(longTicker);

      expect(mockMakeRequest).toHaveBeenCalledWith(`/ticker/${longTicker}/record`);
    });

    it('should handle ticker with spaces (URL encoding handled by HTTP client)', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const spaceTicker = 'TICK ER';
      await kohanClient.recordTicker(spaceTicker);

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/TICK ER/record');
    });

    it('should use GET method by default', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.recordTicker('TEST');

      expect(mockMakeRequest).toHaveBeenCalledWith('/ticker/TEST/record');
      // Verify no method or other options were passed (defaults to GET)
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('getClip', () => {
    it('should retrieve clipboard data successfully', async () => {
      const clipboardData = 'Some clipboard content';
      mockMakeRequest.mockResolvedValue(clipboardData);

      const result = await kohanClient.getClip();

      expect(mockMakeRequest).toHaveBeenCalledWith('/clip');
      expect(result).toBe(clipboardData);
    });

    it('should handle empty clipboard data', async () => {
      mockMakeRequest.mockResolvedValue('');

      const result = await kohanClient.getClip();

      expect(result).toBe('');
    });

    it('should handle multi-line clipboard content', async () => {
      const multiLineContent = 'Line 1\nLine 2\nLine 3';
      mockMakeRequest.mockResolvedValue(multiLineContent);

      const result = await kohanClient.getClip();

      expect(result).toBe(multiLineContent);
    });

    it('should handle clipboard content with special characters', async () => {
      const specialContent = 'Content with special chars: !@#$%^&*()[]{}|;:,.<>?';
      mockMakeRequest.mockResolvedValue(specialContent);

      const result = await kohanClient.getClip();

      expect(result).toBe(specialContent);
    });

    it('should handle clipboard content with Unicode', async () => {
      const unicodeContent = 'Unicode content: 你好 世界 🚀 ñáéíóú';
      mockMakeRequest.mockResolvedValue(unicodeContent);

      const result = await kohanClient.getClip();

      expect(result).toBe(unicodeContent);
    });

    it('should handle very large clipboard content', async () => {
      const largeContent = 'A'.repeat(10000);
      mockMakeRequest.mockResolvedValue(largeContent);

      const result = await kohanClient.getClip();

      expect(result).toBe(largeContent);
      expect(result.length).toBe(10000);
    });

    it('should use GET method by default', async () => {
      mockMakeRequest.mockResolvedValue('test');

      await kohanClient.getClip();

      expect(mockMakeRequest).toHaveBeenCalledWith('/clip');
      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      expect(mockMakeRequest.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('enableSubmap', () => {
    it('should enable submap successfully', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.enableSubmap('swiftkeys');

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: 'swiftkeys' }),
      });
    });

    it('should handle different submap names', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const submapName = 'navigation-keys';
      await kohanClient.enableSubmap(submapName);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: submapName }),
      });
    });

    it('should handle empty submap name', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.enableSubmap('');

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: '' }),
      });
    });

    it('should handle submap names with special characters', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const specialSubmap = 'test-submap_v2.0';
      await kohanClient.enableSubmap(specialSubmap);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: specialSubmap }),
      });
    });

    it('should handle submap names with spaces', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const spacedSubmap = 'my custom submap';
      await kohanClient.enableSubmap(spacedSubmap);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: spacedSubmap }),
      });
    });

    it('should use correct content type header', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.enableSubmap('test');

      const callArgs = mockMakeRequest.mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });

    it('should properly serialize submap parameter to JSON', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.enableSubmap('testmap');

      const callArgs = mockMakeRequest.mock.calls[0];
      const parsedData = JSON.parse(callArgs[1].data);
      expect(parsedData).toEqual({ submap: 'testmap' });
    });
  });

  describe('disableSubmap', () => {
    it('should disable submap successfully', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.disableSubmap('swiftkeys');

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: 'swiftkeys' }),
      });
    });

    it('should handle different submap names', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const submapName = 'debug-mode';
      await kohanClient.disableSubmap(submapName);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: submapName }),
      });
    });

    it('should handle empty submap name', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.disableSubmap('');

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: '' }),
      });
    });

    it('should handle numeric submap names', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const numericSubmap = '12345';
      await kohanClient.disableSubmap(numericSubmap);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: numericSubmap }),
      });
    });

    it('should handle very long submap names', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const longSubmap = 'very-long-submap-name-that-should-still-be-handled-correctly';
      await kohanClient.disableSubmap(longSubmap);

      expect(mockMakeRequest).toHaveBeenCalledWith('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: longSubmap }),
      });
    });

    it('should use correct content type header', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.disableSubmap('test');

      const callArgs = mockMakeRequest.mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });

    it('should properly serialize submap parameter to JSON', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.disableSubmap('testmap');

      const callArgs = mockMakeRequest.mock.calls[0];
      const parsedData = JSON.parse(callArgs[1].data);
      expect(parsedData).toEqual({ submap: 'testmap' });
    });

    it('should use POST method', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await kohanClient.disableSubmap('test');

      const callArgs = mockMakeRequest.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
    });
  });

  describe('method consistency', () => {
    it('should use consistent base URL for all methods', () => {
      const client = new KohanClient('http://test.local:9000/api');

      expect(client.getBaseUrl()).toBe('http://test.local:9000/api');
    });

    it('should handle enable and disable submap with same parameters consistently', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      const submapName = 'consistent-test';

      await kohanClient.enableSubmap(submapName);
      await kohanClient.disableSubmap(submapName);

      expect(mockMakeRequest).toHaveBeenCalledTimes(2);

      // Both calls should have the same JSON payload
      const enableCall = mockMakeRequest.mock.calls[0];
      const disableCall = mockMakeRequest.mock.calls[1];

      expect(enableCall[1].data).toBe(disableCall[1].data);
      expect(enableCall[1].headers).toEqual(disableCall[1].headers);
      expect(enableCall[1].method).toBe(disableCall[1].method);
    });
  });

  describe('error handling', () => {
    describe('recordTicker errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Connection refused');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kohanClient.recordTicker('AAPL')).rejects.toThrow('Failed to record ticker: Connection refused');
      });

      it('should handle service unavailable errors', async () => {
        const serviceError = new Error('503 Service Unavailable: Service temporarily down');
        mockMakeRequest.mockRejectedValue(serviceError);

        await expect(kohanClient.recordTicker('TEST')).rejects.toThrow(
          'Failed to record ticker: 503 Service Unavailable: Service temporarily down'
        );
      });

      it('should handle network timeout errors', async () => {
        const timeoutError = new Error('Network error: Request timeout');
        mockMakeRequest.mockRejectedValue(timeoutError);

        await expect(kohanClient.recordTicker('TIMEOUT')).rejects.toThrow(
          'Failed to record ticker: Network error: Request timeout'
        );
      });

      it('should handle 404 errors for unknown tickers', async () => {
        const notFoundError = new Error('404 Not Found: Ticker not recognized');
        mockMakeRequest.mockRejectedValue(notFoundError);

        await expect(kohanClient.recordTicker('UNKNOWN')).rejects.toThrow(
          'Failed to record ticker: 404 Not Found: Ticker not recognized'
        );
      });

      it('should handle malformed response errors', async () => {
        const parseError = new Error('Failed to parse response: Invalid response format');
        mockMakeRequest.mockRejectedValue(parseError);

        await expect(kohanClient.recordTicker('MALFORMED')).rejects.toThrow(
          'Failed to record ticker: Failed to parse response: Invalid response format'
        );
      });

      it('should handle server internal errors', async () => {
        const serverError = new Error('500 Internal Server Error: Database connection failed');
        mockMakeRequest.mockRejectedValue(serverError);

        await expect(kohanClient.recordTicker('SERVER_ERROR')).rejects.toThrow(
          'Failed to record ticker: 500 Internal Server Error: Database connection failed'
        );
      });
    });

    describe('getClip errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Connection refused');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kohanClient.getClip()).rejects.toThrow('Failed to get clip: Connection refused');
      });

      it('should handle clipboard access denied errors', async () => {
        const accessError = new Error('403 Forbidden: Clipboard access denied');
        mockMakeRequest.mockRejectedValue(accessError);

        await expect(kohanClient.getClip()).rejects.toThrow(
          'Failed to get clip: 403 Forbidden: Clipboard access denied'
        );
      });

      it('should handle service not running errors', async () => {
        const connectionError = new Error('Network error: ECONNREFUSED');
        mockMakeRequest.mockRejectedValue(connectionError);

        await expect(kohanClient.getClip()).rejects.toThrow('Failed to get clip: Network error: ECONNREFUSED');
      });

      it('should handle empty clipboard gracefully in error scenarios', async () => {
        const emptyError = new Error('204 No Content: Clipboard is empty');
        mockMakeRequest.mockRejectedValue(emptyError);

        await expect(kohanClient.getClip()).rejects.toThrow('Failed to get clip: 204 No Content: Clipboard is empty');
      });

      it('should handle clipboard format errors', async () => {
        const formatError = new Error('415 Unsupported Media Type: Unsupported clipboard format');
        mockMakeRequest.mockRejectedValue(formatError);

        await expect(kohanClient.getClip()).rejects.toThrow(
          'Failed to get clip: 415 Unsupported Media Type: Unsupported clipboard format'
        );
      });

      it('should handle system clipboard lock errors', async () => {
        const lockError = new Error('423 Locked: Clipboard is locked by another process');
        mockMakeRequest.mockRejectedValue(lockError);

        await expect(kohanClient.getClip()).rejects.toThrow(
          'Failed to get clip: 423 Locked: Clipboard is locked by another process'
        );
      });
    });

    describe('enableSubmap errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Connection timeout');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kohanClient.enableSubmap('swiftkeys')).rejects.toThrow(
          'Failed to enable submap: Connection timeout'
        );
      });

      it('should handle unknown submap errors', async () => {
        const unknownError = new Error('404 Not Found: Submap not found');
        mockMakeRequest.mockRejectedValue(unknownError);

        await expect(kohanClient.enableSubmap('unknown')).rejects.toThrow(
          'Failed to enable submap: 404 Not Found: Submap not found'
        );
      });

      it('should handle submap already enabled errors', async () => {
        const alreadyEnabledError = new Error('409 Conflict: Submap already enabled');
        mockMakeRequest.mockRejectedValue(alreadyEnabledError);

        await expect(kohanClient.enableSubmap('already-enabled')).rejects.toThrow(
          'Failed to enable submap: 409 Conflict: Submap already enabled'
        );
      });

      it('should handle invalid submap configuration errors', async () => {
        const configError = new Error('422 Unprocessable Entity: Invalid submap configuration');
        mockMakeRequest.mockRejectedValue(configError);

        await expect(kohanClient.enableSubmap('invalid-config')).rejects.toThrow(
          'Failed to enable submap: 422 Unprocessable Entity: Invalid submap configuration'
        );
      });

      it('should handle permission denied errors', async () => {
        const permissionError = new Error('403 Forbidden: Insufficient permissions to enable submap');
        mockMakeRequest.mockRejectedValue(permissionError);

        await expect(kohanClient.enableSubmap('restricted')).rejects.toThrow(
          'Failed to enable submap: 403 Forbidden: Insufficient permissions to enable submap'
        );
      });

      it('should handle JSON serialization errors', async () => {
        // This shouldn't happen in normal usage, but test for completeness
        const jsonError = new Error('Failed to parse response: Unexpected token');
        mockMakeRequest.mockRejectedValue(jsonError);

        await expect(kohanClient.enableSubmap('test')).rejects.toThrow(
          'Failed to enable submap: Failed to parse response: Unexpected token'
        );
      });
    });

    describe('disableSubmap errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Service unreachable');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kohanClient.disableSubmap('swiftkeys')).rejects.toThrow(
          'Failed to disable submap: Service unreachable'
        );
      });

      it('should handle unknown submap errors', async () => {
        const unknownError = new Error('404 Not Found: Submap does not exist');
        mockMakeRequest.mockRejectedValue(unknownError);

        await expect(kohanClient.disableSubmap('nonexistent')).rejects.toThrow(
          'Failed to disable submap: 404 Not Found: Submap does not exist'
        );
      });

      it('should handle submap already disabled errors', async () => {
        const alreadyDisabledError = new Error('409 Conflict: Submap already disabled');
        mockMakeRequest.mockRejectedValue(alreadyDisabledError);

        await expect(kohanClient.disableSubmap('already-disabled')).rejects.toThrow(
          'Failed to disable submap: 409 Conflict: Submap already disabled'
        );
      });

      it('should handle submap in use errors', async () => {
        const inUseError = new Error('423 Locked: Cannot disable submap while in use');
        mockMakeRequest.mockRejectedValue(inUseError);

        await expect(kohanClient.disableSubmap('in-use')).rejects.toThrow(
          'Failed to disable submap: 423 Locked: Cannot disable submap while in use'
        );
      });

      it('should handle system submap protection errors', async () => {
        const protectedError = new Error('403 Forbidden: Cannot disable system submap');
        mockMakeRequest.mockRejectedValue(protectedError);

        await expect(kohanClient.disableSubmap('system')).rejects.toThrow(
          'Failed to disable submap: 403 Forbidden: Cannot disable system submap'
        );
      });

      it('should handle server maintenance errors', async () => {
        const maintenanceError = new Error('503 Service Unavailable: Server under maintenance');
        mockMakeRequest.mockRejectedValue(maintenanceError);

        await expect(kohanClient.disableSubmap('maintenance')).rejects.toThrow(
          'Failed to disable submap: 503 Service Unavailable: Server under maintenance'
        );
      });
    });

    describe('network connectivity issues', () => {
      it('should handle DNS resolution failures', async () => {
        const dnsError = new Error('Network error: ENOTFOUND');
        mockMakeRequest.mockRejectedValue(dnsError);

        await expect(kohanClient.recordTicker('DNS_FAIL')).rejects.toThrow(
          'Failed to record ticker: Network error: ENOTFOUND'
        );
      });

      it('should handle connection refused errors', async () => {
        const connRefusedError = new Error('Network error: ECONNREFUSED');
        mockMakeRequest.mockRejectedValue(connRefusedError);

        await expect(kohanClient.getClip()).rejects.toThrow('Failed to get clip: Network error: ECONNREFUSED');
      });

      it('should handle network timeout errors', async () => {
        const timeoutError = new Error('Network error: Request timeout after 5000ms');
        mockMakeRequest.mockRejectedValue(timeoutError);

        await expect(kohanClient.enableSubmap('timeout')).rejects.toThrow(
          'Failed to enable submap: Network error: Request timeout after 5000ms'
        );
      });

      it('should handle host unreachable errors', async () => {
        const unreachableError = new Error('Network error: EHOSTUNREACH');
        mockMakeRequest.mockRejectedValue(unreachableError);

        await expect(kohanClient.disableSubmap('unreachable')).rejects.toThrow(
          'Failed to disable submap: Network error: EHOSTUNREACH'
        );
      });

      it('should handle SSL/TLS certificate errors', async () => {
        const sslError = new Error('Network error: CERT_HAS_EXPIRED');
        mockMakeRequest.mockRejectedValue(sslError);

        await expect(kohanClient.recordTicker('SSL_ERROR')).rejects.toThrow(
          'Failed to record ticker: Network error: CERT_HAS_EXPIRED'
        );
      });

      it('should handle port unreachable errors', async () => {
        const portError = new Error('Network error: ECONNREFUSED - Port 9010 not accessible');
        mockMakeRequest.mockRejectedValue(portError);

        await expect(kohanClient.getClip()).rejects.toThrow(
          'Failed to get clip: Network error: ECONNREFUSED - Port 9010 not accessible'
        );
      });
    });

    describe('local API specific scenarios', () => {
      it('should handle Kohan service not running', async () => {
        const serviceDownError = new Error('Network error: Connection refused - Is Kohan service running?');
        mockMakeRequest.mockRejectedValue(serviceDownError);

        await expect(kohanClient.recordTicker('SERVICE_DOWN')).rejects.toThrow(
          'Failed to record ticker: Network error: Connection refused - Is Kohan service running?'
        );
      });

      it('should handle localhost resolution issues', async () => {
        const localhostError = new Error('Network error: getaddrinfo ENOTFOUND localhost');
        mockMakeRequest.mockRejectedValue(localhostError);

        await expect(kohanClient.getClip()).rejects.toThrow(
          'Failed to get clip: Network error: getaddrinfo ENOTFOUND localhost'
        );
      });

      it('should handle API version mismatch errors', async () => {
        const versionError = new Error('400 Bad Request: API version not supported');
        mockMakeRequest.mockRejectedValue(versionError);

        await expect(kohanClient.enableSubmap('version_test')).rejects.toThrow(
          'Failed to enable submap: 400 Bad Request: API version not supported'
        );
      });

      it('should handle rate limiting for local API', async () => {
        const rateLimitError = new Error('429 Too Many Requests: Rate limit exceeded');
        mockMakeRequest.mockRejectedValue(rateLimitError);

        await expect(kohanClient.disableSubmap('rate_limit')).rejects.toThrow(
          'Failed to disable submap: 429 Too Many Requests: Rate limit exceeded'
        );
      });
    });
  });
});
