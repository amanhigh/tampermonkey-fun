import { Constants } from '../../src/models/constant';
import { ApiError } from '../../src/models/api_error';
import { TickerTimeframe } from '../../src/models/timeframe';
import { BarkatClient, IBarkatClient } from '../../src/client/barkat';
import { BarkatTickerAnalysis } from '../../src/models/barkat';

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

/** Build a well-formed success envelope for the given ticker. */
function buildEnvelope(ticker: string = 'INTC'): { status: 'success'; data: BarkatTickerAnalysis } {
  return {
    status: 'success',
    data: {
      ticker,
      timeframes: [
        { timeframe: TickerTimeframe.SMN, status: 'warning' },
        { timeframe: TickerTimeframe.TMN, status: 'pass' },
        { timeframe: TickerTimeframe.MN, status: 'fail' },
        { timeframe: TickerTimeframe.WK, status: 'pass' },
      ],
    },
  };
}

describe('BarkatClient', () => {
  let barkatClient: IBarkatClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    barkatClient = new BarkatClient();
    mockMakeRequest = (barkatClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default Barkat base URL', () => {
      expect(new BarkatClient().getBaseUrl()).toBe(Constants.BARKAT.BASE_URL);
      expect(Constants.BARKAT.BASE_URL).toBe('http://localhost:8050/v1/api');
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:9999/v2/api';
      const client = new BarkatClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('getTickerAnalysis', () => {
    it('should GET /tickers/{ticker} with the URL-encoded native symbol', async () => {
      const cases: Array<[string, string]> = [
        ['INTC', '/tickers/INTC'],
        ['BRK.B', '/tickers/BRK.B'],
        ['BRK/B', '/tickers/BRK%2FB'],
      ];

      for (const [ticker, path] of cases) {
        mockMakeRequest.mockResolvedValue(buildEnvelope(ticker) as any);

        await barkatClient.getTickerAnalysis(ticker);

        expect(mockMakeRequest).toHaveBeenLastCalledWith(path);
      }
    });

    it('should return the payload data unchanged, including the server ticker casing', async () => {
      const envelope = buildEnvelope('intc');
      mockMakeRequest.mockResolvedValue(envelope as any);

      const result = await barkatClient.getTickerAnalysis('INTC');

      expect(result).toEqual(envelope.data);
    });

    it('should wrap request errors and preserve the original cause', async () => {
      const apiError = new ApiError(404, 'ticker not found');
      mockMakeRequest.mockRejectedValue(apiError);

      const error = await barkatClient.getTickerAnalysis('INTC').catch((err) => err);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Failed to get ticker analysis for INTC: ticker not found');
      expect(error.cause).toBe(apiError);
      expect(ApiError.isNotFoundError(error)).toBe(true);
    });
  });
});
