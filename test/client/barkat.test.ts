import { Constants } from '../../src/models/constant';
import { ApiError } from '../../src/models/api_error';
import { TickerTimeframe } from '../../src/models/timeframe';
import { BarkatClient, IBarkatClient } from '../../src/client/barkat';

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
function buildEnvelope(ticker: string = 'INTC') {
  const metric = (percentage: number | null, status: string) => ({ percentage, status });
  return {
    status: 'success',
    data: {
      ticker,
      timeframes: [
        {
          timeframe: 'SMN',
          status: 'warning',
          metrics: {
            zone_failures: metric(25, 'warning'),
            strategy_wins: metric(null, 'pass'),
            strategy_entries: metric(0, 'pass'),
          },
        },
        {
          timeframe: 'TMN',
          status: 'pass',
          metrics: {
            zone_failures: metric(0, 'pass'),
            strategy_wins: metric(100, 'pass'),
            strategy_entries: metric(50, 'pass'),
          },
        },
        {
          timeframe: 'MN',
          status: 'fail',
          metrics: {
            zone_failures: metric(75, 'fail'),
            strategy_wins: metric(null, 'warning'),
            strategy_entries: metric(10, 'pass'),
          },
        },
        {
          timeframe: 'WK',
          status: 'pass',
          metrics: {
            zone_failures: metric(null, 'pass'),
            strategy_wins: metric(40, 'pass'),
            strategy_entries: metric(null, 'pass'),
          },
        },
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

    it('should return the four timeframe rows with statuses and null percentages preserved', async () => {
      mockMakeRequest.mockResolvedValue(buildEnvelope() as any);

      const result = await barkatClient.getTickerAnalysis('INTC');

      expect(result.ticker).toBe('INTC');
      expect(result.timeframes.map((row) => row.timeframe)).toEqual([
        TickerTimeframe.SMN,
        TickerTimeframe.TMN,
        TickerTimeframe.MN,
        TickerTimeframe.WK,
      ]);
      expect(result.timeframes.map((row) => row.status)).toEqual(['warning', 'pass', 'fail', 'pass']);
      expect(result.timeframes[0].metrics.zone_failures).toEqual({ percentage: 25, status: 'warning' });
      expect(result.timeframes[0].metrics.strategy_wins).toEqual({ percentage: null, status: 'pass' });
      expect(result.timeframes[2].metrics.strategy_wins).toEqual({ percentage: null, status: 'warning' });
      expect(result.timeframes[3].metrics.strategy_entries.percentage).toBeNull();
    });

    it('should accept tickers that differ only by case', async () => {
      mockMakeRequest.mockResolvedValue(buildEnvelope('intc') as any);

      const result = await barkatClient.getTickerAnalysis('INTC');

      expect(result.ticker).toBe('intc');
    });

    it('should reject a mismatched ticker', async () => {
      mockMakeRequest.mockResolvedValue(buildEnvelope('MSFT') as any);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('Ticker mismatch');
    });

    it('should reject a non-success envelope', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'fail', data: { error: 'boom' } } as any);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('Unsuccessful response status "fail"');
    });

    it('should reject a response without data', async () => {
      mockMakeRequest.mockResolvedValue({ status: 'success' } as any);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('missing data object');
    });

    it('should reject a null response body', async () => {
      mockMakeRequest.mockResolvedValue(null as any);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('expected a success envelope object');
    });

    it('should reject an incomplete timeframe set', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes.pop();
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('expected 4 timeframe rows');
    });

    it('should reject duplicated timeframe rows', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes[1].timeframe = 'SMN';
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('duplicate timeframe row "SMN"');
    });

    it('should reject unsupported timeframes', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes[3].timeframe = 'DL';
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('unsupported timeframe "DL"');
    });

    it('should reject unknown row statuses', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes[0].status = 'unknown';
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('unknown status "unknown"');
    });

    it('should reject non-integer metric percentages', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes[0].metrics.zone_failures.percentage = 12.5;
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow(
        'percentage must be an integer 0..100 or null'
      );
    });

    it('should reject metric percentages outside 0..100', async () => {
      const outOfRange = buildEnvelope() as any;
      outOfRange.data.timeframes[1].metrics.strategy_wins.percentage = 101;
      const negative = buildEnvelope() as any;
      negative.data.timeframes[2].metrics.strategy_entries.percentage = -1;

      mockMakeRequest.mockResolvedValueOnce(outOfRange).mockResolvedValueOnce(negative);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('integer 0..100');
      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('integer 0..100');
    });

    it('should reject missing metrics', async () => {
      const envelope = buildEnvelope() as any;
      delete envelope.data.timeframes[0].metrics.strategy_entries;
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow(
        'Invalid metric "SMN.strategy_entries"'
      );
    });

    it('should reject unknown metric statuses', async () => {
      const envelope = buildEnvelope() as any;
      envelope.data.timeframes[0].metrics.zone_failures.status = 'critical';
      mockMakeRequest.mockResolvedValue(envelope);

      await expect(barkatClient.getTickerAnalysis('INTC')).rejects.toThrow('unknown status "critical"');
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

    it('should wrap validation failures with the contextual prefix', async () => {
      mockMakeRequest.mockResolvedValue(buildEnvelope('MSFT') as any);

      const error = await barkatClient.getTickerAnalysis('INTC').catch((err) => err);

      expect(error.message).toContain('Failed to get ticker analysis for INTC: Ticker mismatch');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});
