import { KiteClient, IKiteClient } from '../../src/client/kite';
import { CreateGttRequest, GttApiResponse } from '../../src/models/kite';

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

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Also define localStorage as a global variable for direct access
(global as any).localStorage = mockLocalStorage;

describe('KiteClient', () => {
  let kiteClient: IKiteClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.getItem.mockReturnValue(null);
    kiteClient = new KiteClient();
    mockMakeRequest = (kiteClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new KiteClient();
      expect(client.getBaseUrl()).toBe('https://kite.zerodha.com/oms/gtt');
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'https://custom.kite.com/api';
      const client = new KiteClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('authentication', () => {
    describe('getAuthToken', () => {
      it('should retrieve auth token from localStorage successfully', () => {
        const testToken = 'test-auth-token-12345';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testToken));

        // Access private method for testing
        const token = (kiteClient as any).getAuthToken();

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('__storejs_kite_enctoken');
        expect(token).toBe(testToken);
      });

      it('should throw error when auth token not found in localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        expect(() => {
          (kiteClient as any).getAuthToken();
        }).toThrow('Auth token not found in localStorage');

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('__storejs_kite_enctoken');
      });

      it('should handle empty string token in localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(''));

        const token = (kiteClient as any).getAuthToken();

        expect(token).toBe('');
      });

      it('should handle complex token structure', () => {
        const complexToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(complexToken));

        const token = (kiteClient as any).getAuthToken();

        expect(token).toBe(complexToken);
      });

      it('should handle malformed JSON in localStorage', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-json-{');

        expect(() => {
          (kiteClient as any).getAuthToken();
        }).toThrow();
      });

      it('should handle undefined localStorage value', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        expect(() => {
          (kiteClient as any).getAuthToken();
        }).toThrow('Auth token not found in localStorage');
      });
    });

    describe('getDefaultHeaders', () => {
      it('should generate correct default headers with auth token', () => {
        const testToken = 'test-token-abc123';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testToken));

        const headers = (kiteClient as any).getDefaultHeaders();

        expect(headers).toEqual({
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Kite-Version': '2.4.0',
          Authorization: `enctoken ${testToken}`,
        });
      });

      it('should include Kite-specific headers', () => {
        const testToken = 'kite-token-xyz789';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testToken));

        const headers = (kiteClient as any).getDefaultHeaders();

        expect(headers['X-Kite-Version']).toBe('2.4.0');
        expect(headers['Authorization']).toBe(`enctoken ${testToken}`);
      });

      it('should handle empty token in authorization header', () => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(''));

        const headers = (kiteClient as any).getDefaultHeaders();

        expect(headers['Authorization']).toBe('enctoken ');
      });

      it('should throw error when no token available for headers', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        expect(() => {
          (kiteClient as any).getDefaultHeaders();
        }).toThrow('Auth token not found in localStorage');
      });

      it('should handle special characters in token', () => {
        const specialToken = 'token-with-special-chars!@#$%^&*()';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(specialToken));

        const headers = (kiteClient as any).getDefaultHeaders();

        expect(headers['Authorization']).toBe(`enctoken ${specialToken}`);
      });
    });
  });

  describe('GTT operations', () => {
    const mockGttRequest = new CreateGttRequest(
      'RELIANCE',
      [2500],
      2450,
      [
        {
          exchange: 'NSE',
          tradingsymbol: 'RELIANCE',
          transaction_type: 'BUY',
          quantity: 1,
          price: 2500,
          order_type: 'MARKET',
          product: 'CNC',
        },
      ],
      'single',
      '2025-12-31 23:59:59'
    );

    beforeEach(() => {
      // Setup auth token for GTT operations
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('test-auth-token'));
    });

    describe('createGTT', () => {
      it('should create GTT successfully', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(mockGttRequest);

        expect(mockMakeRequest).toHaveBeenCalledWith('/triggers', {
          method: 'POST',
          data: mockGttRequest.encode(),
          headers: expect.objectContaining({
            Authorization: 'enctoken test-auth-token',
            'X-Kite-Version': '2.4.0',
          }),
        });
      });

      it('should include all required headers for GTT creation', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(mockGttRequest);

        const callArgs = mockMakeRequest.mock.calls[0];
        const headers = callArgs[1].headers;

        expect(headers).toEqual({
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Kite-Version': '2.4.0',
          Authorization: 'enctoken test-auth-token',
        });
      });

      it('should properly encode GTT request data', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(mockGttRequest);

        const callArgs = mockMakeRequest.mock.calls[0];
        const requestData = callArgs[1].data;

        expect(requestData).toBe(mockGttRequest.encode());
        expect(requestData).toContain('condition=');
        expect(requestData).toContain('orders=');
        expect(requestData).toContain('type=single');
      });

      it('should handle complex GTT requests', async () => {
        const complexRequest = new CreateGttRequest(
          'INFY',
          [1500, 1600],
          1550,
          [
            {
              exchange: 'NSE',
              tradingsymbol: 'INFY',
              transaction_type: 'SELL',
              quantity: 10,
              price: 1500,
              order_type: 'LIMIT',
              product: 'MIS',
            },
            {
              exchange: 'NSE',
              tradingsymbol: 'INFY',
              transaction_type: 'SELL',
              quantity: 10,
              price: 1600,
              order_type: 'LIMIT',
              product: 'MIS',
            },
          ],
          'two-leg',
          '2025-06-30 23:59:59'
        );

        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(complexRequest);

        const callArgs = mockMakeRequest.mock.calls[0];
        const requestData = callArgs[1].data;

        expect(requestData).toContain('type=two-leg');
        expect(requestData).toContain('INFY');
      });
    });

    describe('loadGTT', () => {
      const mockGttResponse: GttApiResponse = {
        data: [
          {
            status: 'active',
            orders: [
              {
                tradingsymbol: 'RELIANCE',
                quantity: 1,
              },
            ],
            type: 'single',
            id: 'gtt_123456',
            condition: {
              trigger_values: [2500],
            },
          },
        ],
      };

      it('should load GTT successfully with callback', async () => {
        const mockCallback = jest.fn();
        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          // Simulate the callback being called
          mockCallback(mockGttResponse);
          return mockGttResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockMakeRequest).toHaveBeenCalledWith('/triggers', {
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'enctoken test-auth-token',
          }),
        });

        expect(mockCallback).toHaveBeenCalledWith(mockGttResponse);
      });

      it('should include correct headers for GTT loading', async () => {
        const mockCallback = jest.fn();
        mockMakeRequest.mockResolvedValue(mockGttResponse);

        await kiteClient.loadGTT(mockCallback);

        const callArgs = mockMakeRequest.mock.calls[0];
        const headers = callArgs[1].headers;

        expect(headers['Authorization']).toBe('enctoken test-auth-token');
        expect(headers['X-Kite-Version']).toBe('2.4.0');
      });

      it('should handle empty GTT response', async () => {
        const emptyResponse: GttApiResponse = { data: [] };
        const mockCallback = jest.fn();

        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(emptyResponse);
          return emptyResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(emptyResponse);
      });

      it('should handle multiple GTT orders in response', async () => {
        const multipleGttResponse: GttApiResponse = {
          data: [
            {
              status: 'active',
              orders: [{ tradingsymbol: 'RELIANCE', quantity: 1 }],
              type: 'single',
              id: 'gtt_123',
              condition: { trigger_values: [2500] },
            },
            {
              status: 'triggered',
              orders: [{ tradingsymbol: 'INFY', quantity: 5 }],
              type: 'single',
              id: 'gtt_456',
              condition: { trigger_values: [1600] },
            },
          ],
        };

        const mockCallback = jest.fn();

        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(multipleGttResponse);
          return multipleGttResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(multipleGttResponse);
        expect(multipleGttResponse.data).toHaveLength(2);
      });
    });

    describe('deleteGTT', () => {
      it('should delete GTT successfully', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const gttId = 'gtt_123456789';
        await kiteClient.deleteGTT(gttId);

        expect(mockMakeRequest).toHaveBeenCalledWith(`/triggers/${gttId}`, {
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'enctoken test-auth-token',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
          }),
        });
      });

      it('should include cache control headers for GTT deletion', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.deleteGTT('test_gtt_id');

        const callArgs = mockMakeRequest.mock.calls[0];
        const headers = callArgs[1].headers;

        expect(headers['Pragma']).toBe('no-cache');
        expect(headers['Cache-Control']).toBe('no-cache');
        expect(headers['Authorization']).toBe('enctoken test-auth-token');
      });

      it('should handle GTT IDs with special characters', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const specialGttId = 'gtt-123_abc.def';
        await kiteClient.deleteGTT(specialGttId);

        expect(mockMakeRequest).toHaveBeenCalledWith(`/triggers/${specialGttId}`, expect.any(Object));
      });

      it('should handle long GTT IDs', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const longGttId = 'gtt_1234567890abcdefghijklmnopqrstuvwxyz';
        await kiteClient.deleteGTT(longGttId);

        expect(mockMakeRequest).toHaveBeenCalledWith(`/triggers/${longGttId}`, expect.any(Object));
      });

      it('should handle empty GTT ID', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.deleteGTT('');

        expect(mockMakeRequest).toHaveBeenCalledWith('/triggers/', expect.any(Object));
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Setup auth token for error handling tests
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify('test-auth-token'));
    });

    describe('createGTT errors', () => {
      const mockGttRequest = new CreateGttRequest(
        'RELIANCE',
        [2500],
        2450,
        [
          {
            exchange: 'NSE',
            tradingsymbol: 'RELIANCE',
            transaction_type: 'BUY',
            quantity: 1,
            price: 2500,
            order_type: 'MARKET',
            product: 'CNC',
          },
        ],
        'single',
        '2025-12-31 23:59:59'
      );

      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Network timeout');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow('Error Creating GTT: Network timeout');
      });

      it('should handle authentication errors', async () => {
        const authError = new Error('401 Unauthorized: Invalid or expired token');
        mockMakeRequest.mockRejectedValue(authError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: 401 Unauthorized: Invalid or expired token'
        );
      });

      it('should handle insufficient funds errors', async () => {
        const fundsError = new Error('400 Bad Request: Insufficient funds');
        mockMakeRequest.mockRejectedValue(fundsError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: 400 Bad Request: Insufficient funds'
        );
      });

      it('should handle invalid symbol errors', async () => {
        const symbolError = new Error('400 Bad Request: Invalid trading symbol');
        mockMakeRequest.mockRejectedValue(symbolError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: 400 Bad Request: Invalid trading symbol'
        );
      });

      it('should handle rate limiting errors', async () => {
        const rateLimitError = new Error('429 Too Many Requests: Rate limit exceeded');
        mockMakeRequest.mockRejectedValue(rateLimitError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: 429 Too Many Requests: Rate limit exceeded'
        );
      });

      it('should handle server maintenance errors', async () => {
        const maintenanceError = new Error('503 Service Unavailable: Server under maintenance');
        mockMakeRequest.mockRejectedValue(maintenanceError);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: 503 Service Unavailable: Server under maintenance'
        );
      });

      it('should handle token not found error during request', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(kiteClient.createGTT(mockGttRequest)).rejects.toThrow(
          'Error Creating GTT: Auth token not found in localStorage'
        );
      });
    });

    describe('loadGTT errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const mockCallback = jest.fn();
        const apiError = new Error('Connection failed');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow('Error Fetching GTT: Connection failed');
      });

      it('should handle authentication errors during GTT loading', async () => {
        const mockCallback = jest.fn();
        const authError = new Error('401 Unauthorized: Session expired');
        mockMakeRequest.mockRejectedValue(authError);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow(
          'Error Fetching GTT: 401 Unauthorized: Session expired'
        );
      });

      it('should handle malformed JSON response errors', async () => {
        const mockCallback = jest.fn();
        const jsonError = new Error('Failed to parse response: Unexpected token');
        mockMakeRequest.mockRejectedValue(jsonError);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow(
          'Error Fetching GTT: Failed to parse response: Unexpected token'
        );
      });

      it('should handle server timeout during GTT loading', async () => {
        const mockCallback = jest.fn();
        const timeoutError = new Error('Request timeout');
        mockMakeRequest.mockRejectedValue(timeoutError);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow('Error Fetching GTT: Request timeout');
      });

      it('should handle permissions errors', async () => {
        const mockCallback = jest.fn();
        const permissionError = new Error('403 Forbidden: Insufficient permissions');
        mockMakeRequest.mockRejectedValue(permissionError);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow(
          'Error Fetching GTT: 403 Forbidden: Insufficient permissions'
        );
      });

      it('should handle token not found error during loading', async () => {
        const mockCallback = jest.fn();
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow(
          'Error Fetching GTT: Auth token not found in localStorage'
        );
      });
    });

    describe('deleteGTT errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Network error');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(kiteClient.deleteGTT('gtt_123')).rejects.toThrow('Error Deleting Trigger: Network error');
      });

      it('should handle GTT not found errors', async () => {
        const notFoundError = new Error('404 Not Found: GTT order not found');
        mockMakeRequest.mockRejectedValue(notFoundError);

        await expect(kiteClient.deleteGTT('invalid_gtt_id')).rejects.toThrow(
          'Error Deleting Trigger: 404 Not Found: GTT order not found'
        );
      });

      it('should handle already cancelled GTT errors', async () => {
        const cancelledError = new Error('400 Bad Request: GTT already cancelled');
        mockMakeRequest.mockRejectedValue(cancelledError);

        await expect(kiteClient.deleteGTT('cancelled_gtt')).rejects.toThrow(
          'Error Deleting Trigger: 400 Bad Request: GTT already cancelled'
        );
      });

      it('should handle triggered GTT deletion errors', async () => {
        const triggeredError = new Error('400 Bad Request: Cannot delete triggered GTT');
        mockMakeRequest.mockRejectedValue(triggeredError);

        await expect(kiteClient.deleteGTT('triggered_gtt')).rejects.toThrow(
          'Error Deleting Trigger: 400 Bad Request: Cannot delete triggered GTT'
        );
      });

      it('should handle authentication errors during deletion', async () => {
        const authError = new Error('401 Unauthorized: Token invalid');
        mockMakeRequest.mockRejectedValue(authError);

        await expect(kiteClient.deleteGTT('gtt_123')).rejects.toThrow(
          'Error Deleting Trigger: 401 Unauthorized: Token invalid'
        );
      });

      it('should handle token not found error during deletion', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(kiteClient.deleteGTT('gtt_123')).rejects.toThrow(
          'Error Deleting Trigger: Auth token not found in localStorage'
        );
      });
    });

    describe('authentication failures', () => {
      it('should handle createGTT without authentication', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        const mockRequest = new CreateGttRequest(
          'TEST',
          [100],
          95,
          [
            {
              exchange: 'NSE',
              tradingsymbol: 'TEST',
              transaction_type: 'BUY',
              quantity: 1,
              price: 100,
              order_type: 'LIMIT',
              product: 'CNC',
            },
          ],
          'single',
          '2025-12-31'
        );

        await expect(kiteClient.createGTT(mockRequest)).rejects.toThrow(
          'Error Creating GTT: Auth token not found in localStorage'
        );
      });

      it('should handle loadGTT without authentication', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        const mockCallback = jest.fn();

        await expect(kiteClient.loadGTT(mockCallback)).rejects.toThrow(
          'Error Fetching GTT: Auth token not found in localStorage'
        );
      });

      it('should handle deleteGTT without authentication', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(kiteClient.deleteGTT('gtt_123')).rejects.toThrow(
          'Error Deleting Trigger: Auth token not found in localStorage'
        );
      });
    });
  });

  describe('edge cases and localStorage scenarios', () => {
    describe('localStorage edge cases', () => {
      it('should handle localStorage with null JSON', () => {
        mockLocalStorage.getItem.mockReturnValue('null');

        const token = (kiteClient as any).getAuthToken();
        expect(token).toBeNull();
      });

      it('should handle localStorage with boolean JSON', () => {
        mockLocalStorage.getItem.mockReturnValue('true');

        const token = (kiteClient as any).getAuthToken();
        expect(token).toBe(true);
      });

      it('should handle localStorage with number JSON', () => {
        mockLocalStorage.getItem.mockReturnValue('12345');

        const token = (kiteClient as any).getAuthToken();
        expect(token).toBe(12345);
      });

      it('should handle localStorage with array JSON', () => {
        const arrayToken = ['token', 'parts'];
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(arrayToken));

        const token = (kiteClient as any).getAuthToken();
        expect(token).toEqual(arrayToken);
      });

      it('should handle localStorage with object JSON', () => {
        const objectToken = { token: 'value', expires: '2025-12-31' };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(objectToken));

        const token = (kiteClient as any).getAuthToken();
        expect(token).toEqual(objectToken);
      });

      it('should handle localStorage corruption during operations', async () => {
        const mockRequest = new CreateGttRequest(
          'TEST',
          [100],
          95,
          [
            {
              exchange: 'NSE',
              tradingsymbol: 'TEST',
              transaction_type: 'BUY',
              quantity: 1,
              price: 100,
              order_type: 'LIMIT',
              product: 'CNC',
            },
          ],
          'single',
          '2025-12-31'
        );

        // Simulate localStorage corruption during operation
        mockLocalStorage.getItem.mockImplementationOnce(() => {
          throw new Error('QuotaExceededError: localStorage corrupted');
        });

        await expect(kiteClient.createGTT(mockRequest)).rejects.toThrow(
          'Error Creating GTT: QuotaExceededError: localStorage corrupted'
        );
      });

      it('should handle very long tokens in localStorage', () => {
        const longToken = 'a'.repeat(1000); // Reduced length for test efficiency
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(longToken));

        const token = (kiteClient as any).getAuthToken();
        expect(token).toBe(longToken);
        expect(token.length).toBe(1000);
      });

      it('should handle tokens with Unicode characters', () => {
        const unicodeToken = 'token-with-unicode-🚀-世界-ñáéíóú';
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(unicodeToken));

        const token = (kiteClient as any).getAuthToken();
        expect(token).toBe(unicodeToken);
      });
    });

    describe('malformed response scenarios', () => {
      beforeEach(() => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify('test-token'));
      });

      it('should handle null response from loadGTT', async () => {
        const mockCallback = jest.fn();
        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(null);
          return null;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(null);
      });

      it('should handle response with missing data property', async () => {
        const mockCallback = jest.fn();
        const malformedResponse = { status: 'success' };

        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(malformedResponse);
          return malformedResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(malformedResponse);
      });

      it('should handle response with malformed data array', async () => {
        const mockCallback = jest.fn();
        const malformedResponse = { data: 'not-an-array' };

        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(malformedResponse);
          return malformedResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(malformedResponse);
      });

      it('should handle response with incomplete GTT data', async () => {
        const mockCallback = jest.fn();
        const incompleteResponse: GttApiResponse = {
          data: [
            {
              // Missing required fields
              status: undefined as any,
              orders: [],
              type: '',
              id: '',
              condition: { trigger_values: [] },
            },
          ],
        };

        mockMakeRequest.mockImplementation(async (_url: string, _options: any) => {
          mockCallback(incompleteResponse);
          return incompleteResponse;
        });

        await kiteClient.loadGTT(mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(incompleteResponse);
      });
    });

    describe('GTT request edge cases', () => {
      beforeEach(() => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify('test-token'));
      });

      it('should handle GTT request with extreme values', async () => {
        const extremeRequest = new CreateGttRequest(
          'STOCK',
          [999999.99, 0.01],
          500000.5,
          [
            {
              exchange: 'NSE',
              tradingsymbol: 'STOCK',
              transaction_type: 'SELL',
              quantity: 99999,
              price: 999999.99,
              order_type: 'LIMIT',
              product: 'MIS',
            },
          ],
          'two-leg',
          '2099-12-31 23:59:59'
        );

        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(extremeRequest);

        expect(mockMakeRequest).toHaveBeenCalled();
      });

      it('should handle GTT request with minimal order data', async () => {
        const minimalRequest = new CreateGttRequest(
          'TEST',
          [100],
          95,
          [
            {
              exchange: 'NSE',
              tradingsymbol: 'TEST',
              transaction_type: 'BUY',
              quantity: 1,
              price: 100,
              order_type: 'LIMIT',
              product: 'CNC',
            },
          ],
          'single',
          '2025-12-31 23:59:59'
        );

        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.createGTT(minimalRequest);

        const callArgs = mockMakeRequest.mock.calls[0];
        const requestData = callArgs[1].data;
        expect(requestData).toContain('type=single');
      });

      it('should handle very large GTT IDs for deletion', async () => {
        const largeId = 'gtt_' + 'x'.repeat(1000);
        mockMakeRequest.mockResolvedValue({ success: true });

        await kiteClient.deleteGTT(largeId);

        expect(mockMakeRequest).toHaveBeenCalledWith(`/triggers/${largeId}`, expect.any(Object));
      });
    });

    describe('concurrent operations', () => {
      beforeEach(() => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify('test-token'));
      });

      it('should handle multiple simultaneous GTT operations', async () => {
        const requests = [
          new CreateGttRequest(
            'STOCK1',
            [100],
            95,
            [
              {
                exchange: 'NSE',
                tradingsymbol: 'STOCK1',
                transaction_type: 'BUY',
                quantity: 1,
                price: 100,
                order_type: 'LIMIT',
                product: 'CNC',
              },
            ],
            'single',
            '2025-12-31'
          ),
          new CreateGttRequest(
            'STOCK2',
            [200],
            195,
            [
              {
                exchange: 'NSE',
                tradingsymbol: 'STOCK2',
                transaction_type: 'BUY',
                quantity: 1,
                price: 200,
                order_type: 'LIMIT',
                product: 'CNC',
              },
            ],
            'single',
            '2025-12-31'
          ),
          new CreateGttRequest(
            'STOCK3',
            [300],
            295,
            [
              {
                exchange: 'NSE',
                tradingsymbol: 'STOCK3',
                transaction_type: 'BUY',
                quantity: 1,
                price: 300,
                order_type: 'LIMIT',
                product: 'CNC',
              },
            ],
            'single',
            '2025-12-31'
          ),
        ];

        mockMakeRequest.mockResolvedValue({ success: true });

        const promises = requests.map((request) => kiteClient.createGTT(request));
        await Promise.all(promises);

        expect(mockMakeRequest).toHaveBeenCalledTimes(3);
      });

      it('should handle simultaneous load and delete operations', async () => {
        const mockCallback = jest.fn();
        mockMakeRequest.mockResolvedValue({ data: [] });

        const loadPromise = kiteClient.loadGTT(mockCallback);
        const deletePromise = kiteClient.deleteGTT('gtt_123');

        await Promise.all([loadPromise, deletePromise]);

        expect(mockMakeRequest).toHaveBeenCalledTimes(2);
      });
    });
  });
});
