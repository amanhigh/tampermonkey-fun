// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

import { RecentTickerRepo, IRecentTickerRepo } from '../../src/repo/recent';
import { IRepoCron } from '../../src/repo/cron';

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('RecentTickerRepo - Specific Logic', () => {
  let recentRepo: IRecentTickerRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    recentRepo = new RecentTickerRepo(mockRepoCron);
  });

  it('should initialize with correct store ID', () => {
    expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(recentRepo);
  });
});
