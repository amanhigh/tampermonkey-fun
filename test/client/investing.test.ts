import { InvestingClient, IInvestingClient } from '../../src/client/investing';
import { Alert, PairInfo } from '../../src/models/alert';
import { SearchResponse } from '../../src/models/investing';

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

describe('InvestingClient', () => {
  let investingClient: IInvestingClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    investingClient = new InvestingClient();
    mockMakeRequest = (investingClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new InvestingClient();
      expect(client.getBaseUrl()).toBe('https://in.investing.com');
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'https://custom.investing.com';
      const client = new InvestingClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('createAlert', () => {
    const alertParams = {
      name: 'AAPL Alert',
      pairId: '123456',
      price: 150.5,
      ltp: 148.0,
    };

    it('should create alert successfully for price above LTP', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      const result = await investingClient.createAlert(
        alertParams.name,
        alertParams.pairId,
        alertParams.price,
        alertParams.ltp
      );

      expect(mockMakeRequest).toHaveBeenCalledWith('/useralerts/service/create', {
        method: 'POST',
        data: expect.stringContaining('alertType=instrument'),
      });

      expect(mockMakeRequest).toHaveBeenCalledWith('/useralerts/service/create', {
        method: 'POST',
        data: expect.stringContaining('alertParams%5Bthreshold%5D=over'),
      });

      expect(result).toEqual({
        name: alertParams.name,
        pairId: alertParams.pairId,
        price: alertParams.price,
      });
    });

    it('should create alert successfully for price below LTP', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      await investingClient.createAlert(
        alertParams.name,
        alertParams.pairId,
        140.0, // Below LTP
        alertParams.ltp
      );

      expect(mockMakeRequest).toHaveBeenCalledWith('/useralerts/service/create', {
        method: 'POST',
        data: expect.stringContaining('alertParams%5Bthreshold%5D=under'),
      });
    });

    it('should include all required parameters in request', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      await investingClient.createAlert(alertParams.name, alertParams.pairId, alertParams.price, alertParams.ltp);

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain('alertType=instrument');
      expect(requestData).toContain('alertParams%5Balert_trigger%5D=price');
      expect(requestData).toContain(`alertParams%5Bpair_ID%5D=${alertParams.pairId}`);
      expect(requestData).toContain('alertParams%5Bfrequency%5D=Once');
      expect(requestData).toContain(`alertParams%5Bvalue%5D=${alertParams.price}`);
      expect(requestData).toContain('alertParams%5Bplatform%5D=desktopAlertsCenter');
      expect(requestData).toContain('alertParams%5Bemail_alert%5D=Yes');
    });

    it('should handle decimal prices correctly', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      const decimalPrice = 123.456;
      await investingClient.createAlert('Test', '123', decimalPrice, 120.0);

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain(`alertParams%5Bvalue%5D=${decimalPrice}`);
    });

    it('should handle zero price correctly', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      const result = await investingClient.createAlert('Test', '123', 0, 100);

      expect(result.price).toBe(0);
    });

    it('should handle equal price and LTP (threshold over)', async () => {
      mockMakeRequest.mockResolvedValue({ success: true });

      await investingClient.createAlert('Test', '123', 100, 100);

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain('alertParams%5Bthreshold%5D=under');
    });
  });

  describe('deleteAlert', () => {
    const testAlert = new Alert('alert123', '456789', 150.5);

    it('should delete alert successfully', async () => {
      mockMakeRequest.mockResolvedValue('success');

      await investingClient.deleteAlert(testAlert);

      expect(mockMakeRequest).toHaveBeenCalledWith('/useralerts/service/delete', {
        method: 'POST',
        data: expect.stringContaining('alertType=instrument'),
        responseType: 'text',
      });

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain(`alertParams%5Balert_ID%5D=${testAlert.id}`);
      expect(requestData).toContain('alertParams%5Bplatform%5D=desktop');
    });

    it('should handle alert with special characters in ID', async () => {
      mockMakeRequest.mockResolvedValue('success');

      const specialAlert = new Alert('alert-123_test', '456', 100);
      await investingClient.deleteAlert(specialAlert);

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain(`alertParams%5Balert_ID%5D=${specialAlert.id}`);
    });
  });

  describe('fetchSymbolData', () => {
    const mockSearchResponse: SearchResponse = {
      All: [
        {
          name: 'Apple Inc',
          pair_ID: '6408',
          symbol: 'AAPL',
          exchange_name_short: 'NASDAQ',
        },
        {
          name: 'Microsoft Corp',
          pair_ID: '6409',
          symbol: 'MSFT',
          exchange_name_short: 'NASDAQ',
        },
      ],
    };

    it('should fetch symbol data successfully', async () => {
      mockMakeRequest.mockResolvedValue(mockSearchResponse);

      const result = await investingClient.fetchSymbolData('AAPL');

      expect(mockMakeRequest).toHaveBeenCalledWith('/search/service/search?searchType=alertCenterInstruments', {
        method: 'POST',
        data: expect.stringContaining('search_text=AAPL'),
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PairInfo);
      expect(result[0].name).toBe('Apple Inc');
      expect(result[0].pairId).toBe('6408');
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].exchange).toBe('NASDAQ');
    });

    it('should include all search parameters in request', async () => {
      mockMakeRequest.mockResolvedValue(mockSearchResponse);

      await investingClient.fetchSymbolData('TEST');

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain('search_text=TEST');
      expect(requestData).toContain('term=TEST');
      expect(requestData).toContain('country_id=0');
      expect(requestData).toContain('tab_id=All');
    });

    it('should handle symbol with special characters', async () => {
      mockMakeRequest.mockResolvedValue(mockSearchResponse);

      const specialSymbol = 'BRK.A';
      await investingClient.fetchSymbolData(specialSymbol);

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain(`search_text=${specialSymbol}`);
      expect(requestData).toContain(`term=${specialSymbol}`);
    });

    it('should handle empty symbol string', async () => {
      mockMakeRequest.mockResolvedValue(mockSearchResponse);

      await investingClient.fetchSymbolData('');

      const callArgs = mockMakeRequest.mock.calls[0];
      const requestData = callArgs[1].data;

      expect(requestData).toContain('search_text=');
      expect(requestData).toContain('term=');
    });

    it('should convert numeric pair_ID to string', async () => {
      const responseWithNumericId: SearchResponse = {
        All: [
          {
            name: 'Test Company',
            pair_ID: 12345 as any,
            symbol: 'TEST',
            exchange_name_short: 'NYSE',
          },
        ],
      };

      mockMakeRequest.mockResolvedValue(responseWithNumericId);

      const result = await investingClient.fetchSymbolData('TEST');

      expect(result[0].pairId).toBe('12345');
      expect(typeof result[0].pairId).toBe('string');
    });
  });

  describe('getAllAlerts', () => {
    const validAlertHtml = `
      <html>
        <body>
          <div class="js-alert-item">Alert 1</div>
          <div class="js-alert-item">Alert 2</div>
        </body>
      </html>
    `;

    it('should fetch alert center HTML successfully', async () => {
      mockMakeRequest.mockResolvedValue(validAlertHtml);

      const result = await investingClient.getAllAlerts();

      expect(mockMakeRequest).toHaveBeenCalledWith('/members-admin/alert-center', {
        method: 'GET',
        responseType: 'text',
      });

      expect(result).toBe(validAlertHtml);
    });

    it('should validate response contains alert items', async () => {
      mockMakeRequest.mockResolvedValue(validAlertHtml);

      const result = await investingClient.getAllAlerts();

      expect(result).toContain('js-alert-item');
    });

    it('should handle empty HTML response', async () => {
      mockMakeRequest.mockResolvedValue('');

      await expect(investingClient.getAllAlerts()).rejects.toThrow('Invalid alert center response');
    });

    it('should handle HTML without alert items', async () => {
      const htmlWithoutAlerts = '<html><body><div>No alerts</div></body></html>';
      mockMakeRequest.mockResolvedValue(htmlWithoutAlerts);

      await expect(investingClient.getAllAlerts()).rejects.toThrow('Invalid alert center response');
    });

    it('should handle null response', async () => {
      mockMakeRequest.mockResolvedValue(null);

      await expect(investingClient.getAllAlerts()).rejects.toThrow('Invalid alert center response');
    });
  });

  describe('error handling', () => {
    describe('createAlert errors', () => {
      const alertParams = {
        name: 'AAPL Alert',
        pairId: '123456',
        price: 150.5,
        ltp: 148.0,
      };

      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Network timeout');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(
          investingClient.createAlert(alertParams.name, alertParams.pairId, alertParams.price, alertParams.ltp)
        ).rejects.toThrow('Failed to create alert: Network timeout');
      });

      it('should handle server error responses', async () => {
        const serverError = new Error('500 Internal Server Error: Server maintenance');
        mockMakeRequest.mockRejectedValue(serverError);

        await expect(
          investingClient.createAlert(alertParams.name, alertParams.pairId, alertParams.price, alertParams.ltp)
        ).rejects.toThrow('Failed to create alert: 500 Internal Server Error: Server maintenance');
      });

      it('should handle authentication errors', async () => {
        const authError = new Error('401 Unauthorized: Invalid session');
        mockMakeRequest.mockRejectedValue(authError);

        await expect(
          investingClient.createAlert(alertParams.name, alertParams.pairId, alertParams.price, alertParams.ltp)
        ).rejects.toThrow('Failed to create alert: 401 Unauthorized: Invalid session');
      });

      it('should handle network connectivity issues', async () => {
        const networkError = new Error('Network error: Connection refused');
        mockMakeRequest.mockRejectedValue(networkError);

        await expect(
          investingClient.createAlert(alertParams.name, alertParams.pairId, alertParams.price, alertParams.ltp)
        ).rejects.toThrow('Failed to create alert: Network error: Connection refused');
      });
    });

    describe('deleteAlert errors', () => {
      const testAlert = new Alert('alert123', '456789', 150.5);

      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('404 Not Found: Alert not found');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(investingClient.deleteAlert(testAlert)).rejects.toThrow(
          'Failed to delete alert: 404 Not Found: Alert not found'
        );
      });

      it('should handle permission errors', async () => {
        const permissionError = new Error('403 Forbidden: Access denied');
        mockMakeRequest.mockRejectedValue(permissionError);

        await expect(investingClient.deleteAlert(testAlert)).rejects.toThrow(
          'Failed to delete alert: 403 Forbidden: Access denied'
        );
      });

      it('should handle malformed response errors', async () => {
        const parseError = new Error('Failed to parse response: Unexpected end of JSON');
        mockMakeRequest.mockRejectedValue(parseError);

        await expect(investingClient.deleteAlert(testAlert)).rejects.toThrow(
          'Failed to delete alert: Failed to parse response: Unexpected end of JSON'
        );
      });
    });

    describe('fetchSymbolData errors', () => {
      it('should wrap API errors with descriptive message', async () => {
        const apiError = new Error('Rate limit exceeded');
        mockMakeRequest.mockRejectedValue(apiError);

        await expect(investingClient.fetchSymbolData('AAPL')).rejects.toThrow(
          'Failed to fetch symbol data: Rate limit exceeded'
        );
      });

      it('should handle empty search results', async () => {
        const emptyResponse: SearchResponse = { All: [] };
        mockMakeRequest.mockResolvedValue(emptyResponse);

        await expect(investingClient.fetchSymbolData('INVALID')).rejects.toThrow(
          'No results found for symbol: INVALID'
        );
      });

      it('should handle missing All property in response', async () => {
        const invalidResponse = { Some: [] };
        mockMakeRequest.mockResolvedValue(invalidResponse);

        await expect(investingClient.fetchSymbolData('TEST')).rejects.toThrow('No results found for symbol: TEST');
      });

      it('should handle null All property', async () => {
        const nullResponse: SearchResponse = { All: null as any };
        mockMakeRequest.mockResolvedValue(nullResponse);

        await expect(investingClient.fetchSymbolData('TEST')).rejects.toThrow('No results found for symbol: TEST');
      });

      it('should handle undefined All property', async () => {
        const undefinedResponse: SearchResponse = { All: undefined };
        mockMakeRequest.mockResolvedValue(undefinedResponse);

        await expect(investingClient.fetchSymbolData('TEST')).rejects.toThrow('No results found for symbol: TEST');
      });

      it('should handle server timeout errors', async () => {
        const timeoutError = new Error('Request timeout');
        mockMakeRequest.mockRejectedValue(timeoutError);

        await expect(investingClient.fetchSymbolData('AAPL')).rejects.toThrow(
          'Failed to fetch symbol data: Request timeout'
        );
      });

      it('should handle malformed JSON response', async () => {
        const jsonError = new Error('Failed to parse response: Unexpected token');
        mockMakeRequest.mockRejectedValue(jsonError);

        await expect(investingClient.fetchSymbolData('AAPL')).rejects.toThrow(
          'Failed to fetch symbol data: Failed to parse response: Unexpected token'
        );
      });
    });

    describe('getAllAlerts errors', () => {
      it('should handle network errors gracefully', async () => {
        const networkError = new Error('Network error: DNS resolution failed');
        mockMakeRequest.mockRejectedValue(networkError);

        await expect(investingClient.getAllAlerts()).rejects.toThrow('Network error: DNS resolution failed');
      });

      it('should handle authentication redirect responses', async () => {
        const authError = new Error('302 Found: Redirect to login');
        mockMakeRequest.mockRejectedValue(authError);

        await expect(investingClient.getAllAlerts()).rejects.toThrow('302 Found: Redirect to login');
      });

      it('should handle server maintenance responses', async () => {
        const maintenanceError = new Error('503 Service Unavailable: Under maintenance');
        mockMakeRequest.mockRejectedValue(maintenanceError);

        await expect(investingClient.getAllAlerts()).rejects.toThrow('503 Service Unavailable: Under maintenance');
      });

      it('should validate response format strictly', async () => {
        const invalidHtml = '<html><body>Some content without alert items</body></html>';
        mockMakeRequest.mockResolvedValue(invalidHtml);

        await expect(investingClient.getAllAlerts()).rejects.toThrow('Invalid alert center response');
      });
    });
  });

  describe('edge cases and boundary conditions', () => {
    describe('createAlert edge cases', () => {
      it('should handle very large price values', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const largePrice = 999999999.99;
        const result = await investingClient.createAlert('Test', '123', largePrice, 1000);

        expect(result.price).toBe(largePrice);
      });

      it('should handle very small price values', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const smallPrice = 0.0001;
        const result = await investingClient.createAlert('Test', '123', smallPrice, 1);

        expect(result.price).toBe(smallPrice);
      });

      it('should handle negative price values', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const negativePrice = -50.25;
        const result = await investingClient.createAlert('Test', '123', negativePrice, 0);

        expect(result.price).toBe(negativePrice);
      });

      it('should handle very long pairId', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const longPairId = '123456789012345678901234567890';
        const result = await investingClient.createAlert('Test', longPairId, 100, 90);

        expect(result.pairId).toBe(longPairId);
      });

      it('should handle empty name', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const result = await investingClient.createAlert('', '123', 100, 90);

        expect(result.name).toBe('');
      });

      it('should handle name with special characters', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const specialName = 'AT&T Inc. (NYSE:T) - 5% Alert!@#$%^&*()';
        const result = await investingClient.createAlert(specialName, '123', 100, 90);

        expect(result.name).toBe(specialName);
      });

      it('should handle Unicode characters in name', async () => {
        mockMakeRequest.mockResolvedValue({ success: true });

        const unicodeName = 'Börse Frankfurt 股票 アラート';
        const result = await investingClient.createAlert(unicodeName, '123', 100, 90);

        expect(result.name).toBe(unicodeName);
      });
    });

    describe('fetchSymbolData edge cases', () => {
      it('should handle response with missing fields', async () => {
        const incompleteResponse: SearchResponse = {
          All: [
            {
              name: 'Test Company',
              pair_ID: '123',
              symbol: '',
              exchange_name_short: undefined as any,
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(incompleteResponse);

        const result = await investingClient.fetchSymbolData('TEST');

        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('');
        expect(result[0].exchange).toBeUndefined();
      });

      it('should handle response with null field values', async () => {
        const nullFieldsResponse: SearchResponse = {
          All: [
            {
              name: null as any,
              pair_ID: '123',
              symbol: null as any,
              exchange_name_short: null as any,
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(nullFieldsResponse);

        const result = await investingClient.fetchSymbolData('TEST');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBeNull();
        expect(result[0].symbol).toBeNull();
        expect(result[0].exchange).toBeNull();
      });

      it('should handle single character symbol search', async () => {
        const singleCharResponse: SearchResponse = {
          All: [
            {
              name: 'Single Char Company',
              pair_ID: '123',
              symbol: 'X',
              exchange_name_short: 'NYSE',
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(singleCharResponse);

        const result = await investingClient.fetchSymbolData('X');

        expect(result).toHaveLength(1);
        expect(result[0].symbol).toBe('X');
      });

      it('should handle very long symbol names', async () => {
        const longNameResponse: SearchResponse = {
          All: [
            {
              name: 'Very Long Company Name That Exceeds Normal Character Limits For Testing Purposes Only',
              pair_ID: '123',
              symbol: 'VERYLONGTICKERTEST',
              exchange_name_short: 'NASDAQ',
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(longNameResponse);

        const result = await investingClient.fetchSymbolData('LONG');

        expect(result[0].name).toBe(
          'Very Long Company Name That Exceeds Normal Character Limits For Testing Purposes Only'
        );
        expect(result[0].symbol).toBe('VERYLONGTICKERTEST');
      });

      it('should handle response with zero as pair_ID', async () => {
        const zeroPairIdResponse: SearchResponse = {
          All: [
            {
              name: 'Zero ID Company',
              pair_ID: 0 as any,
              symbol: 'ZERO',
              exchange_name_short: 'NYSE',
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(zeroPairIdResponse);

        const result = await investingClient.fetchSymbolData('ZERO');

        expect(result[0].pairId).toBe('0');
        expect(typeof result[0].pairId).toBe('string');
      });

      it('should handle response with negative pair_ID', async () => {
        const negativePairIdResponse: SearchResponse = {
          All: [
            {
              name: 'Negative ID Company',
              pair_ID: -123 as any,
              symbol: 'NEG',
              exchange_name_short: 'NYSE',
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(negativePairIdResponse);

        const result = await investingClient.fetchSymbolData('NEG');

        expect(result[0].pairId).toBe('-123');
      });

      it('should handle large result sets', async () => {
        const largeResponse: SearchResponse = {
          All: Array.from({ length: 100 }, (_, i) => ({
            name: `Company ${i}`,
            pair_ID: `${1000 + i}`,
            symbol: `SYM${i}`,
            exchange_name_short: 'NYSE',
          })),
        };

        mockMakeRequest.mockResolvedValue(largeResponse);

        const result = await investingClient.fetchSymbolData('MANY');

        expect(result).toHaveLength(100);
        expect(result[0].name).toBe('Company 0');
        expect(result[99].name).toBe('Company 99');
      });

      it('should handle special characters in search results', async () => {
        const specialCharsResponse: SearchResponse = {
          All: [
            {
              name: 'AT&T Inc. (T)',
              pair_ID: '123',
              symbol: 'T',
              exchange_name_short: 'NYSE',
            },
            {
              name: 'Berkshire Hathaway Inc. Class A (BRK.A)',
              pair_ID: '456',
              symbol: 'BRK.A',
              exchange_name_short: 'NYSE',
            },
          ],
        };

        mockMakeRequest.mockResolvedValue(specialCharsResponse);

        const result = await investingClient.fetchSymbolData('berkshire');

        expect(result).toHaveLength(2);
        expect(result[0].name).toContain('AT&T');
        expect(result[1].symbol).toBe('BRK.A');
      });
    });

    describe('getAllAlerts edge cases', () => {
      it('should handle minimal valid HTML', async () => {
        const minimalHtml = '<div class="js-alert-item"></div>';
        mockMakeRequest.mockResolvedValue(minimalHtml);

        const result = await investingClient.getAllAlerts();

        expect(result).toBe(minimalHtml);
      });

      it('should handle HTML with multiple alert item classes', async () => {
        const multipleClassHtml = '<div class="alert-container js-alert-item other-class"></div>';
        mockMakeRequest.mockResolvedValue(multipleClassHtml);

        const result = await investingClient.getAllAlerts();

        expect(result).toBe(multipleClassHtml);
      });

      it('should handle very large HTML responses', async () => {
        const largeHtml = `
          <html><body>
            ${Array.from({ length: 1000 }, (_, i) => `<div class="js-alert-item">Alert ${i}</div>`).join('\n')}
          </body></html>
        `;
        mockMakeRequest.mockResolvedValue(largeHtml);

        const result = await investingClient.getAllAlerts();

        expect(result).toBe(largeHtml);
        expect(result).toContain('js-alert-item');
      });

      it('should handle HTML with Unicode characters', async () => {
        const unicodeHtml = `
          <html><body>
            <div class="js-alert-item">Börse Alert 株式 アラート</div>
          </body></html>
        `;
        mockMakeRequest.mockResolvedValue(unicodeHtml);

        const result = await investingClient.getAllAlerts();

        expect(result).toBe(unicodeHtml);
      });

      it('should require exact class name match', async () => {
        const similarClassHtml = '<div class="alert-item">Similar but not exact</div>';
        mockMakeRequest.mockResolvedValue(similarClassHtml);

        await expect(investingClient.getAllAlerts()).rejects.toThrow('Invalid alert center response');
      });
    });
  });
});
