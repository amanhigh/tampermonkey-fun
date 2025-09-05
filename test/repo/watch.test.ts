// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

import { Watchlistrepo, IWatchlistRepo } from '../../src/repo/watch';
import { IRepoCron } from '../../src/repo/cron';
import { CategoryLists } from '../../src/models/category';

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('WatchlistRepo - Specific Logic', () => {
  let watchlistRepo: IWatchlistRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    watchlistRepo = new Watchlistrepo(mockRepoCron);
  });

  it('should return category lists via getter', () => {
    const lists = watchlistRepo.getWatchCategoryLists();
    expect(lists).toBeInstanceOf(CategoryLists);
    expect(lists.getLists()).toBeDefined();
  });
});
