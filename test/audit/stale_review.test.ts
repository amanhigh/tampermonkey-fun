import { StaleReviewPlugin } from '../../src/manager/stale_review_plugin';
import { IRecentTickerRepo } from '../../src/repo/recent';
import { ITickerRepo } from '../../src/repo/ticker';
import { IWatchManager } from '../../src/manager/watch';

describe('StaleReviewPlugin', () => {
  let plugin: StaleReviewPlugin;
  let mockRecentRepo: Partial<IRecentTickerRepo>;
  let mockTickerRepo: Partial<ITickerRepo>;
  let mockWatchManager: Partial<IWatchManager>;

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  beforeEach(() => {
    mockRecentRepo = { get: jest.fn().mockReturnValue(undefined) };
    mockTickerRepo = { getAllKeys: jest.fn().mockReturnValue([]) };
    mockWatchManager = { isWatched: jest.fn().mockReturnValue(false) };

    plugin = new StaleReviewPlugin(
      mockRecentRepo as IRecentTickerRepo,
      mockTickerRepo as ITickerRepo,
      mockWatchManager as IWatchManager
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

  test('flags tickers never opened as MEDIUM severity', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['TCS', 'INFY']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(undefined);

    const results = await plugin.run();
    expect(results).toHaveLength(2);
    expect(results[0].severity).toBe('MEDIUM');
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

  test('skips watched tickers', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['WATCHED', 'UNWATCHED']);
    (mockRecentRepo.get as jest.Mock).mockReturnValue(undefined);
    (mockWatchManager.isWatched as jest.Mock).mockImplementation((ticker: string) => ticker === 'WATCHED');

    const results = await plugin.run();
    expect(results).toHaveLength(1);
    expect(results[0].target).toBe('UNWATCHED');
  });

  test('respects custom threshold', async () => {
    const customPlugin = new StaleReviewPlugin(
      mockRecentRepo as IRecentTickerRepo,
      mockTickerRepo as ITickerRepo,
      mockWatchManager as IWatchManager,
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
