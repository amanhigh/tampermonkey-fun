import { SequenceRepo, ISequenceRepo } from '../../src/repo/sequence';
import { IRepoCron } from '../../src/repo/cron';
import { SequenceType } from '../../src/models/trading';

// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('SequenceRepo', () => {
  let sequenceRepo: ISequenceRepo;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    sequenceRepo = new SequenceRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(sequenceRepo);
    });

    it('should initialize with empty maps', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(sequenceRepo.getCount()).toBe(0);
      expect(sequenceRepo.getAllKeys()).toEqual([]);
    });
  });

  describe('sequence validation and fallback logic', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      sequenceRepo.clear();
    });

    it('should return default sequence when no mapping exists', () => {
      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.MWD);
      expect(sequenceRepo.getSequence('AAPL', SequenceType.YR)).toBe(SequenceType.YR);
    });

    it('should return mapped sequence when mapping exists', () => {
      sequenceRepo.set('HDFC', SequenceType.YR);
      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.YR);
    });

    it('should handle multiple sequence mappings', () => {
      sequenceRepo.set('HDFC', SequenceType.YR);
      sequenceRepo.set('AAPL', SequenceType.MWD);
      sequenceRepo.set('TCS', SequenceType.YR);

      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.YR);
      expect(sequenceRepo.getSequence('AAPL', SequenceType.YR)).toBe(SequenceType.MWD);
      expect(sequenceRepo.getSequence('TCS', SequenceType.MWD)).toBe(SequenceType.YR);
    });

    it('should pin sequence correctly', () => {
      sequenceRepo.pinSequence('HDFC', SequenceType.YR);
      expect(sequenceRepo.get('HDFC')).toBe(SequenceType.YR);
      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.YR);
    });

    it('should allow changing sequence for same ticker', () => {
      sequenceRepo.pinSequence('HDFC', SequenceType.MWD);
      expect(sequenceRepo.getSequence('HDFC', SequenceType.YR)).toBe(SequenceType.MWD);

      sequenceRepo.pinSequence('HDFC', SequenceType.YR);
      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.YR);
    });
  });

  describe('deserialization with validation', () => {
    it('should filter out invalid sequences during deserialization', async () => {
      const mockData = {
        HDFC: SequenceType.MWD,
        AAPL: SequenceType.YR,
        INVALID: 'INVALID_SEQUENCE' as any,
        TCS: SequenceType.MWD,
        EMPTY: '' as any,
      };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new SequenceRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.get('HDFC')).toBe(SequenceType.MWD);
      expect(loadedData.get('AAPL')).toBe(SequenceType.YR);
      expect(loadedData.get('TCS')).toBe(SequenceType.MWD);
      expect(loadedData.has('INVALID')).toBe(false);
      expect(loadedData.has('EMPTY')).toBe(false);
      expect(loadedData.size).toBe(3);
    });

    it('should handle empty data during deserialization', async () => {
      mockGM.getValue.mockResolvedValue({});

      const newRepo = new SequenceRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.size).toBe(0);
    });

    it('should handle mixed valid and invalid data', async () => {
      const mockData = {
        VALID1: SequenceType.MWD,
        INVALID1: 'INVALID',
        VALID2: SequenceType.YR,
        INVALID2: null as any,
        INVALID3: undefined as any,
      };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new SequenceRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.get('VALID1')).toBe(SequenceType.MWD);
      expect(loadedData.get('VALID2')).toBe(SequenceType.YR);
      expect(loadedData.has('INVALID1')).toBe(false);
      expect(loadedData.has('INVALID2')).toBe(false);
      expect(loadedData.has('INVALID3')).toBe(false);
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      sequenceRepo.clear();
    });

    it('should handle empty string ticker', () => {
      expect(sequenceRepo.getSequence('', SequenceType.MWD)).toBe(SequenceType.MWD);
      sequenceRepo.pinSequence('', SequenceType.YR);
      expect(sequenceRepo.getSequence('', SequenceType.MWD)).toBe(SequenceType.YR);
    });

    it('should handle special characters in ticker', () => {
      const specialTicker = 'TICKER.WITH.DOTS';
      sequenceRepo.pinSequence(specialTicker, SequenceType.YR);
      expect(sequenceRepo.getSequence(specialTicker, SequenceType.MWD)).toBe(SequenceType.YR);
    });

    it('should handle case sensitivity in tickers', () => {
      sequenceRepo.pinSequence('HDFC', SequenceType.YR);
      expect(sequenceRepo.getSequence('hdfC', SequenceType.MWD)).toBe(SequenceType.MWD); // Case sensitive
      expect(sequenceRepo.getSequence('HDFC', SequenceType.MWD)).toBe(SequenceType.YR);
    });
  });
});
