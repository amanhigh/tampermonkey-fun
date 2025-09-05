import { FlagRepo, IFlagRepo } from '../../src/repo/flag';
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

describe('FlagRepo', () => {
  let flagRepo: IFlagRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    flagRepo = new FlagRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(flagRepo);
    });

    it('should initialize with empty category lists', () => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        expect(flagRepo.getCount()).toBe(0);
        expect(flagRepo.getAllItems().size).toBe(0);
      });
    });
  });

  describe('category operations', () => {
    beforeEach(() => {
      return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
        // Clear any existing data
        const lists = flagRepo.getFlagCategoryLists();
        lists.getLists().clear();
      });
    });

    it('should add items to categories', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      expect(lists.contains(1, 'FLAG_A')).toBe(true);
      expect(flagRepo.getCount()).toBe(1);
    });

    it('should remove items from categories', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.delete(1, 'FLAG_A');
      expect(lists.contains(1, 'FLAG_A')).toBe(false);
    });

    it('should toggle items in categories', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.toggle(1, 'FLAG_A');
      expect(lists.contains(1, 'FLAG_A')).toBe(true);
      lists.toggle(1, 'FLAG_A');
      expect(lists.contains(1, 'FLAG_A')).toBe(false);
    });

    it('should enforce single category constraint', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.add(2, 'FLAG_A'); // Should move from category 1 to 2
      expect(lists.contains(1, 'FLAG_A')).toBe(false);
      expect(lists.contains(2, 'FLAG_A')).toBe(true);
    });

    it('should get correct count', () => {
      const lists = flagRepo.getFlagCategoryLists();
      expect(flagRepo.getCount()).toBe(0);
      lists.add(1, 'FLAG_A');
      expect(flagRepo.getCount()).toBe(1);
      lists.add(2, 'FLAG_B');
      expect(flagRepo.getCount()).toBe(2);
    });

    it('should get all items across categories', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.add(1, 'FLAG_B');
      lists.add(2, 'FLAG_C');

      const allItems = flagRepo.getAllItems();
      expect(allItems.has('FLAG_A')).toBe(true);
      expect(allItems.has('FLAG_B')).toBe(true);
      expect(allItems.has('FLAG_C')).toBe(true);
      expect(allItems.size).toBe(3);
    });
  });

  describe('load and save operations', () => {
    it('should load category data from GM storage', async () => {
      const mockData = { 1: ['FLAG_A', 'FLAG_B'], 2: ['FLAG_C'] };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new FlagRepo(mockRepoCron);
      await newRepo.load();

      const lists = newRepo.getFlagCategoryLists();
      expect(lists.contains(1, 'FLAG_A')).toBe(true);
      expect(lists.contains(1, 'FLAG_B')).toBe(true);
      expect(lists.contains(2, 'FLAG_C')).toBe(true);
    });

    it('should save category data to GM storage', async () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.add(2, 'FLAG_B');

      await flagRepo.save();

      expect(mockGM.setValue).toHaveBeenCalledWith('flagRepo', expect.any(Object));
      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData[1]).toContain('FLAG_A');
      expect(savedData[2]).toContain('FLAG_B');
    });

    it('should handle GM API load errors', async () => {
      mockGM.getValue.mockRejectedValue(new Error('Storage error'));
      await expect(flagRepo.load()).rejects.toThrow('Storage error');
    });

    it('should handle GM API save errors', async () => {
      mockGM.setValue.mockRejectedValue(new Error('Save failed'));
      await expect(flagRepo.save()).rejects.toThrow('Save failed');
    });
  });

  describe('data persistence and serialization', () => {
    it('should persist data through save and load cycle', async () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.add(2, 'FLAG_B');

      await flagRepo.save();

      const savedData = mockGM.setValue.mock.calls[0][1];
      mockGM.getValue.mockResolvedValue(savedData);

      const newRepo = new FlagRepo(mockRepoCron);
      await newRepo.load();

      const newLists = newRepo.getFlagCategoryLists();
      expect(newLists.contains(1, 'FLAG_A')).toBe(true);
      expect(newLists.contains(2, 'FLAG_B')).toBe(true);
    });

    it('should handle empty data serialization', async () => {
      await flagRepo.save();
      const savedData = mockGM.setValue.mock.calls[0][1];
      expect(savedData).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent categories', () => {
      const lists = flagRepo.getFlagCategoryLists();
      expect(lists.contains(999, 'FLAG_A')).toBe(false);
      expect(lists.getList(999)).toBeUndefined();
    });

    it('should handle duplicate items within same category', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, 'FLAG_A');
      lists.add(1, 'FLAG_A'); // Duplicate
      expect(lists.getList(1)?.size).toBe(1);
    });

    it('should handle empty strings', () => {
      const lists = flagRepo.getFlagCategoryLists();
      lists.add(1, '');
      expect(lists.contains(1, '')).toBe(true);
      expect(flagRepo.getAllItems().has('')).toBe(true);
    });

    it('should handle special characters in flags', () => {
      const lists = flagRepo.getFlagCategoryLists();
      const specialFlag = 'FLAG-WITH-DASH';
      lists.add(1, specialFlag);
      expect(lists.contains(1, specialFlag)).toBe(true);
    });
  });
});
