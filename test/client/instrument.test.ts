import { InstrumentClient, IInstrumentClient } from '../../src/client/instrument';
import { InvestingResponse } from '../../src/models/investing';

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

describe('InstrumentClient', () => {
  let instrumentClient: IInstrumentClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  const mockInvestingResponse: InvestingResponse = {
    quotes: [
      { id: 8874, url: '/indices/nq-100-futures', description: 'Nasdaq 100 Futures', symbol: 'NQM26', exchange: 'CME' },
      { id: 8849, url: '/commodities/crude-oil', description: 'Crude Oil WTI', symbol: 'CL', exchange: 'NYMEX' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    instrumentClient = new InstrumentClient();
    mockMakeRequest = (instrumentClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with public search base URL', () => {
      const client = new InstrumentClient();
      expect(client.getBaseUrl()).toBe('https://api.investing.com/api/search');
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'https://custom.api/search';
      const client = new InstrumentClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('getInstruments', () => {
    it('should call public search API with encoded query and default limit', async () => {
      mockMakeRequest.mockResolvedValue(mockInvestingResponse);

      await instrumentClient.getInstruments('Nasdaq 100');

      expect(mockMakeRequest).toHaveBeenCalledTimes(1);
      const calledQuery: string = mockMakeRequest.mock.calls[0][0];
      expect(calledQuery).toBe('?q=Nasdaq+100&limit=10');
    });

    it('should support custom limit', async () => {
      mockMakeRequest.mockResolvedValue(mockInvestingResponse);

      await instrumentClient.getInstruments('Crude Oil', 5);

      const calledQuery: string = mockMakeRequest.mock.calls[0][0];
      expect(calledQuery).toBe('?q=Crude+Oil&limit=5');
    });

    it('should return raw InvestingResponse unchanged', async () => {
      mockMakeRequest.mockResolvedValue(mockInvestingResponse);

      const result = await instrumentClient.getInstruments('Nasdaq 100');

      expect(result).toEqual(mockInvestingResponse);
      expect(result.quotes).toHaveLength(2);
      expect(result.quotes![0].id).toBe(8874);
      expect(result.quotes![0].description).toBe('Nasdaq 100 Futures');
    });

    it('should handle empty response', async () => {
      const emptyResponse: InvestingResponse = {};
      mockMakeRequest.mockResolvedValue(emptyResponse);

      const result = await instrumentClient.getInstruments('ZZZZZ');

      expect(result.quotes).toBeUndefined();
    });

    it('should wrap API errors with descriptive message', async () => {
      const apiError = new Error('Network timeout');
      mockMakeRequest.mockRejectedValue(apiError);

      await expect(instrumentClient.getInstruments('Nasdaq 100')).rejects.toThrow(
        'Failed to get instruments: Network timeout'
      );
    });
  });
});
