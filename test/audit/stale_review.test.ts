import { StaleReviewPlugin } from '../../src/manager/stale_review_plugin';
import { IRecentTickerRepo } from '../../src/repo/recent';
import { ITickerRepo } from '../../src/repo/ticker';
import { IWatchManager } from '../../src/manager/watch';
import { IFlagManager } from '../../src/manager/flag';

describe('StaleReviewPlugin', () => {
  let plugin: StaleReviewPlugin;
  let mockRecentRepo: Partial<IRecentTickerRepo>;
  let mockTickerRepo: Partial<ITickerRepo>;
  let mockWatchManager: Partial<IWatchManager>;
  let mockFlagManager: Partial<IFlagManager>;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  beforeEach(() => {
    mockRecentRepo = { get: jest.fn().mockReturnValue(undefined) };
    mockTickerRepo = { getAllKeys: jest.fn().mockReturnValue([]) };
    mockWatchManager = { getCategory: jest.fn().mockReturnValue(new Set()) };
    mockFlagManager = { getCategory: jest.fn().mockReturnValue(new Set()) };

    plugin = new StaleReviewPlugin(
      mockRecentRepo as IRecentTickerRepo,
      mockTickerRepo as ITickerRepo,
      mockWatchManager as IWatchManager,
      mockFlagManager as IFlagManager
    );
  });

  test('has correct id and title', () => {
    expect(plugin.id).toBe('stale-review');
    expect(plugin.title).toBe('Stale Review');
  });

  test('validates successfully', () => {
    expect(() => plugin.validate()).not.toThrow();
  });

  test('rejects targeted mode', async () => {
    await expect(plugin.run(['TCS'])).rejects.toThrow('does not support targeted mode');
  });

  test('returns empty when no tickers exist', async () => {
    const results = await plugin.run();
    expect(results).toEqual([]);
  });

  test('flags tickers never opened as HIGH severity', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['TCS', 'INFY']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(undefined);

    const results = await plugin.run();
    expect(results).toHaveLength(2);
    expect(results[0].severity).toBe('HIGH');
    expect(results[0].message).toContain('never opened');
    expect(results[0].data?.daysSinceOpen).toBe(-1);
  });

  test('flags tickers opened beyond threshold as MEDIUM severity', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['OLD']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(now - 100 * DAY_MS);

    const results = await plugin.run();
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('MEDIUM');
    expect(results[0].data?.daysSinceOpen).toBeGreaterThanOrEqual(99);
  });

  test('skips tickers opened within threshold', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['FRESH']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(now - 10 * DAY_MS);

    const results = await plugin.run();
    expect(results).toHaveLength(0);
  });

  test('includes watch and flag categories in data', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['STALE']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(undefined);
    (mockWatchManager.getCategory as jest.Mock).mockImplementation((i: number) => {
      return i === 0 ? new Set(['STALE']) : new Set();
    });
    (mockFlagManager.getCategory as jest.Mock).mockImplementation((i: number) => {
      return i === 2 ? new Set(['STALE']) : new Set();
    });

    const results = await plugin.run();
    expect(results).toHaveLength(1);
    expect(results[0].data?.watchCategories).toEqual([0]);
    expect(results[0].data?.flagCategories).toEqual([2]);
  });

  test('respects custom threshold', async () => {
    const customPlugin = new StaleReviewPlugin(
      mockRecentRepo as IRecentTickerRepo,
      mockTickerRepo as ITickerRepo,
      mockWatchManager as IWatchManager,
      mockFlagManager as IFlagManager,
      30
    );

    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['A']);
    // 50 days ago — stale for 30-day threshold, not for 90-day
    (mockRecentRepo.get as jest.Mock).mockReturnValue(now - 50 * DAY_MS);

    const customResults = await customPlugin.run();
    expect(customResults).toHaveLength(1);

    const defaultResults = await plugin.run();
    expect(defaultResults).toHaveLength(0);
  });
});
