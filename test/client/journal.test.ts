import { JournalClient, IJournalClient } from '../../src/client/journal';
import { Constants } from '../../src/models/constant';

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

    it('should wrap list journal errors with context', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(
        journalClient.listJournals({ ticker: 'TCS' })
      ).rejects.toThrow('Failed to list journals: 500 Internal Server Error');
    });
  });
});
