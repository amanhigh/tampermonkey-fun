// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

import { PairRepo, IPairRepo } from '../../src/repo/pair';
import { PairInfo } from '../../src/models/alert';
import { IRepoCron } from '../../src/repo/cron';

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('PairRepo - Critical Specific Logic', () => {
  let pairRepo: IPairRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    pairRepo = new PairRepo(mockRepoCron);
  });

  describe('custom PairInfo serialization', () => {
    it('should deserialize PairInfo objects with all fields', async () => {
      const mockData = {
        AAPL: { name: 'Apple Inc', pairId: '12345', exchange: 'NASDAQ', symbol: 'AAPL' },
      };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new PairRepo(mockRepoCron);
      await newRepo.load();

      const appleInfo = newRepo.getPairInfo('AAPL');
      expect(appleInfo).toBeInstanceOf(PairInfo);
      expect(appleInfo?.name).toBe('Apple Inc');
      expect(appleInfo?.pairId).toBe('12345');
      expect(appleInfo?.exchange).toBe('NASDAQ');
      expect(appleInfo?.symbol).toBe('AAPL');
    });

    it('should serialize PairInfo excluding symbol field', async () => {
      const pairInfo = new PairInfo('Tesla Inc', '99999', 'NASDAQ', 'TSLA');
      pairRepo.pinPair('TSLA', pairInfo);

      await pairRepo.save();

      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData.TSLA).toEqual({
        name: 'Tesla Inc',
        pairId: '99999',
        exchange: 'NASDAQ',
        // Note: symbol field intentionally excluded by current implementation
      });
      expect(savedData.TSLA.symbol).toBeUndefined();
    });
  });

  describe('deserialization error handling', () => {
    it('should reject invalid pairId types during deserialization', async () => {
      const invalidData = {
        INVALID: { name: 'Test', pairId: 12345, exchange: 'NASDAQ', symbol: 'TEST' },
      };
      mockGM.getValue.mockResolvedValue(invalidData);

      const newRepo = new PairRepo(mockRepoCron);
      await expect(newRepo.load()).rejects.toThrow('Expected Test, pairID - 12345 to be a string');
    });
  });

  describe('wrapper method behavior', () => {
    it('should return null for non-existent pairs', () => {
      expect(pairRepo.getPairInfo('NONEXISTENT')).toBeNull();
    });
  });
});
