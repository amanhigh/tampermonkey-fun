import { OsClient, IOsClient } from '../../src/client/os';
import { Constants } from '../../src/models/constant';

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

describe('OsClient', () => {
  let osClient: IOsClient;
  let mockMakeRequest: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    osClient = new OsClient();
    mockMakeRequest = (osClient as any).makeRequest;
  });

  describe('constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new OsClient();
      expect(client.getBaseUrl()).toBe(Constants.KOHAN.BASE_URL);
    });

    it('should create instance with custom base URL', () => {
      const customUrl = 'http://custom.local:8080/v1/api';
      const client = new OsClient(customUrl);
      expect(client.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('screenshot', () => {
    it('should make POST request to /os/screenshot with given payload', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { file_name: 'test.png', full_path: '/tmp/test.png' },
      });

      const result = await osClient.screenshot({
        file_name: 'test.png',
        directory_type: 'JOURNAL',
        type: 'FULL',
        window: 'TradingView',
        notify: true,
      });

      expect(result).toEqual({ file_name: 'test.png', full_path: '/tmp/test.png' });
      expect(mockMakeRequest).toHaveBeenCalledWith('/os/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          file_name: 'test.png',
          directory_type: 'JOURNAL',
          type: 'FULL',
          window: 'TradingView',
          notify: true,
        }),
      });
    });

    it('should wrap errors with contextual message', async () => {
      mockMakeRequest.mockRejectedValue(new Error('500 Server Error'));

      await expect(
        osClient.screenshot({ file_name: 'x.png', directory_type: 'JOURNAL', type: 'FULL' })
      ).rejects.toThrow('Failed to take journal screenshots: 500 Server Error');
    });
  });

  describe('screenshotRegion', () => {
    it('should capture REGION screenshot with DL timeframe metadata', async () => {
      mockMakeRequest.mockResolvedValue({
        status: 'success',
        data: { file_name: 'TCS_20240422_0930_checklist_set.png', full_path: '/home/aman/Downloads/TCS_20240422_0930_checklist_set.png' },
      });

      const result = await osClient.screenshotRegion('TCS', 'set');

      expect(mockMakeRequest).toHaveBeenCalledWith('/os/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: expect.stringMatching(/"file_name":"TCS_\d{8}_\d{4}_checklist_set\.png"/),
      });
      expect(result.timeframe).toBe('DL');
    });

    it('should propagate errors', async () => {
      mockMakeRequest.mockRejectedValue(new Error('screenshot failed'));

      await expect(osClient.screenshotRegion('TCS', 'set')).rejects.toThrow('screenshot failed');
    });
  });

  describe('getClip', () => {
    it('should make GET request to /os/clip/', async () => {
      mockMakeRequest.mockResolvedValue('clipboard-data');

      const result = await osClient.getClip();

      expect(result).toBe('clipboard-data');
      expect(mockMakeRequest).toHaveBeenCalledWith('/os/clip/');
    });
  });

  describe('enableSubmap', () => {
    it('should make POST request to /os/submap/enable', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await osClient.enableSubmap('swiftkeys');

      expect(mockMakeRequest).toHaveBeenCalledWith('/os/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: 'swiftkeys' }),
      });
    });
  });

  describe('disableSubmap', () => {
    it('should make POST request to /os/submap/disable', async () => {
      mockMakeRequest.mockResolvedValue(undefined);

      await osClient.disableSubmap('swiftkeys');

      expect(mockMakeRequest).toHaveBeenCalledWith('/os/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap: 'swiftkeys' }),
      });
    });
  });
});
