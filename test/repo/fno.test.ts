import { FnoRepo, IFnoRepo } from '../../src/repo/fno';
import { IRepoCron } from '../../src/repo/cron';

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

describe('FnoRepo', () => {
  let fnoRepo: IFnoRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    fnoRepo = new FnoRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(fnoRepo);
    });
  });

  describe('Set operations', () => {
    beforeEach(() => {
      // Ensure we start with empty repo for these tests
      mockGM.getValue.mockResolvedValue([]);
      fnoRepo = new FnoRepo(mockRepoCron);
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        // Clear default symbols for clean test state
        fnoRepo.clear();
      });
    });

    it('should add symbols', () => {
      fnoRepo.add('RELIANCE');
      expect(fnoRepo.has('RELIANCE')).toBe(true);
      expect(fnoRepo.getCount()).toBe(1);
    });

    it('should delete symbols', () => {
      fnoRepo.add('TCS');
      expect(fnoRepo.has('TCS')).toBe(true);

      const deleted = fnoRepo.delete('TCS');
      expect(deleted).toBe(true);
      expect(fnoRepo.has('TCS')).toBe(false);
      expect(fnoRepo.getCount()).toBe(0);
    });

    it('should return false when deleting non-existent symbol', () => {
      const deleted = fnoRepo.delete('NON_EXISTENT');
      expect(deleted).toBe(false);
    });

    it('should check symbol existence', () => {
      expect(fnoRepo.has('INFY')).toBe(false);

      fnoRepo.add('INFY');
      expect(fnoRepo.has('INFY')).toBe(true);
    });

    it('should get all symbols', () => {
      fnoRepo.add('HDFC');
      fnoRepo.add('ICICI');

      const allSymbols = fnoRepo.getAll();
      expect(allSymbols).toBeInstanceOf(Set);
      expect(allSymbols.has('HDFC')).toBe(true);
      expect(allSymbols.has('ICICI')).toBe(true);
      expect(allSymbols.size).toBe(2);
    });

    it('should get correct count', () => {
      expect(fnoRepo.getCount()).toBe(0);

      fnoRepo.add('WIPRO');
      expect(fnoRepo.getCount()).toBe(1);

      fnoRepo.add('TECHM');
      expect(fnoRepo.getCount()).toBe(2);

      fnoRepo.delete('WIPRO');
      expect(fnoRepo.getCount()).toBe(1);
    });

    it('should clear all symbols', () => {
      fnoRepo.add('SYMBOL1');
      fnoRepo.add('SYMBOL2');
      expect(fnoRepo.getCount()).toBe(2);

      fnoRepo.clear();
      expect(fnoRepo.getCount()).toBe(0);
      expect(fnoRepo.has('SYMBOL1')).toBe(false);
      expect(fnoRepo.has('SYMBOL2')).toBe(false);
    });
  });

  describe('load and save operations', () => {
    it('should load data from GM storage', async () => {
      const mockData = ['HCLTECH', 'LT'];
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new FnoRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData).toBeInstanceOf(Set);
      expect(loadedData.has('HCLTECH')).toBe(true);
      expect(loadedData.has('LT')).toBe(true);
    });

    it('should save data to GM storage', async () => {
      fnoRepo.add('MARUTI');
      fnoRepo.add('TITAN');

      await fnoRepo.save();

      expect(mockGM.setValue).toHaveBeenCalledWith('fnoRepo', expect.any(Array));
      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData).toContain('MARUTI');
      expect(savedData).toContain('TITAN');
    });

    it('should handle GM API load errors', async () => {
      mockGM.getValue.mockRejectedValue(new Error('Storage error'));

      await expect(fnoRepo.load()).rejects.toThrow('Storage error');
    });

    it('should handle GM API save errors', async () => {
      mockGM.setValue.mockRejectedValue(new Error('Save failed'));

      await expect(fnoRepo.save()).rejects.toThrow('Save failed');
    });
  });

  describe('data persistence and serialization', () => {
    it('should persist data through save and load cycle', async () => {
      // Clear defaults and add some symbols
      fnoRepo.clear();
      fnoRepo.add('BHARTIARTL');
      fnoRepo.add('KOTAKBANK');

      // Save data
      await fnoRepo.save();

      // Create new instance and load
      const savedData = mockGM.setValue.mock.calls[0][1];
      mockGM.getValue.mockResolvedValue(savedData);

      const newRepo = new FnoRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.has('BHARTIARTL')).toBe(true);
      expect(loadedData.has('KOTAKBANK')).toBe(true);
      expect(loadedData.size).toBe(2);
    });

    it('should handle empty data serialization', async () => {
      // Clear any default symbols first
      fnoRepo.clear();
      await fnoRepo.save();

      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData).toEqual([]);
    });

    it('should handle large dataset', () => {
      // Clear defaults first
      fnoRepo.clear();

      const symbols = Array.from({ length: 100 }, (_, i) => `SYMBOL${i}`);

      symbols.forEach((symbol) => fnoRepo.add(symbol));
      expect(fnoRepo.getCount()).toBe(100);

      const allSymbols = fnoRepo.getAll();
      expect(allSymbols.size).toBe(100);
      symbols.forEach((symbol) => expect(allSymbols.has(symbol)).toBe(true));
    });
  });

  describe('default symbols initialization', () => {
    it('should initialize with correct default symbols', () => {
      mockGM.getValue.mockResolvedValue([]);

      const newRepo = new FnoRepo(mockRepoCron);

      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        const allSymbols = newRepo.getAll();
        expect(allSymbols.has('ASIANPAINT')).toBe(true);
        expect(allSymbols.has('AXISBANK')).toBe(true);
        expect(allSymbols.has('BAJAJ_AUTO')).toBe(true);
        expect(newRepo.getCount()).toBe(3);
      });
    });

    it('should not override existing data with defaults', () => {
      const existingData = ['CUSTOM_SYMBOL'];
      mockGM.getValue.mockResolvedValue(existingData);

      const newRepo = new FnoRepo(mockRepoCron);

      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        expect(newRepo.has('CUSTOM_SYMBOL')).toBe(true);
        expect(newRepo.has('ASIANPAINT')).toBe(false);
        expect(newRepo.getCount()).toBe(1);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle duplicate additions', () => {
      fnoRepo.clear(); // Clear defaults
      fnoRepo.add('DUPLICATE');
      fnoRepo.add('DUPLICATE');

      expect(fnoRepo.getCount()).toBe(1);
      expect(fnoRepo.has('DUPLICATE')).toBe(true);
    });

    it('should handle empty string symbols', () => {
      fnoRepo.clear(); // Clear defaults
      fnoRepo.add('');
      expect(fnoRepo.has('')).toBe(true);
      expect(fnoRepo.getCount()).toBe(1);
    });

    it('should handle special characters in symbols', () => {
      const specialSymbol = 'SYMBOL-WITH-DASH';
      fnoRepo.add(specialSymbol);
      expect(fnoRepo.has(specialSymbol)).toBe(true);
    });

    it('should handle case sensitivity', () => {
      fnoRepo.add('SYMBOL');
      expect(fnoRepo.has('symbol')).toBe(false);
      expect(fnoRepo.has('SYMBOL')).toBe(true);
    });
  });
});
