import { JournalClient, IJournalClient } from '../../src/client/journal';
import { Constants } from '../../src/models/constant';
import { TickerTimeframe } from '../../src/models/timeframe';

// Mock the BaseClient's makeRequest method (same pattern as alert_ticker.test.ts)
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

describe('JournalClient', () => {
  let journalClient: IJournalClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    journalClient = new JournalClient();
    mockMakeRequest = (journalClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new JournalClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new JournalClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('listJournals', () => {
    it('should GET query params and unwrap Kohan envelope data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          journals: [{ id: 'jrn_1', ticker: 'TCS', type: 'SET', status: 'SUCCESS' }],
          metadata: { total: 1, offset: 0, limit: 10 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await journalClient.listJournals({ ticker: 'TCS', status: 'SET' });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/journals?')
      );
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('ticker=TCS')
      );
      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('status=SET')
      );
      expect(result).toEqual(apiEnvelope.data);
      expect(result.journals).toHaveLength(1);
    });

    it('should serialize top_timeframe filter in query string', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          journals: [],
          metadata: { total: 0, offset: 0, limit: 10 },
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      await journalClient.listJournals({ top_timeframe: TickerTimeframe.SMN });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/journals?top_timeframe=SMN')
      );
    });

    it('should wrap list journal errors with context', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        journalClient.listJournals({ ticker: 'TCS' })
      ).rejects.toThrow('Failed to list journals: 500 Internal Server Error');
    });
  });

  describe('createJournal', () => {
    it('should POST request body with top_timeframe and without legacy sequence', async () => {
      const apiEnvelope = {
        status: 'success',
        data: {
          id: 'jrn_1',
          ticker: 'TCS',
          top_timeframe: 'SMN',
          type: 'TAKEN',
          status: 'SET',
          created_at: '2026-04-22T00:00:00Z',
        },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await journalClient.createJournal({
        ticker: 'TCS',
        top_timeframe: TickerTimeframe.SMN,
        type: 'TAKEN',
        status: 'SET',
        images: [],
      });

      expect(mockMakeRequest).toHaveBeenCalledWith(
        expect.stringContaining('/journals'),
        expect.objectContaining({
          method: 'POST',
          data: expect.stringContaining('"top_timeframe":"SMN"'),
        })
      );

      const requestData = (mockMakeRequest.mock.calls[0][1] as { data: string }).data;
      expect(requestData).not.toContain('sequence');

      expect(result).toEqual(apiEnvelope.data);
    });
  });

  describe('getJournal', () => {
    it('should GET a journal by id and unwrap Kohan envelope data', async () => {
      const apiEnvelope = {
        status: 'success',
        data: { id: 'jrn_abc123', ticker: 'NSE:KLAC' },
      };

      mockMakeRequest.mockResolvedValue(apiEnvelope as any);

      const result = await journalClient.getJournal('jrn_abc123');

      expect(mockMakeRequest).toHaveBeenCalledWith('/journals/jrn_abc123');
      expect(result).toEqual(apiEnvelope.data);
    });

    it('should wrap get journal errors with context', async () => {
      mockMakeRequest.mockRejectedValue(new Error('404 Not Found'));

      await expect(journalClient.getJournal('jrn_abc123')).rejects.toThrow(
        'Failed to get journal: 404 Not Found'
      );
    });
  });
});
