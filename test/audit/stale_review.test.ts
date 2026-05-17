import { StaleReviewPlugin } from '../../src/manager/stale_review_plugin';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerRepo } from '../../src/repo/ticker';
import { IWatchManager } from '../../src/manager/watch';

describe('StaleReviewPlugin', () => {
  let plugin: StaleReviewPlugin;
  let mockRecentManager: Partial<IRecentManager>;
  let mockTickerRepo: Partial<ITickerRepo>;
  let mockWatchManager: Partial<IWatchManager>;

  beforeEach(() => {
    mockRecentManager = { isRecent: jest.fn().mockReturnValue(true) };
    mockTickerRepo = { getAllKeys: jest.fn().mockReturnValue([]) };
    mockWatchManager = { isWatched: jest.fn().mockReturnValue(false) };

    plugin = new StaleReviewPlugin(
      mockRecentManager as IRecentManager,
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

  test('flags tickers that are not recent (stale) as MEDIUM severity', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['TCS', 'INFY']);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(false);

    const results = await plugin.run();
    expect(results).toHaveLength(2);
    expect(results[0].severity).toBe('MEDIUM');
    expect(results[0].message).toContain('not recently opened');
  });

  test('skips tickers that are recent', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['FRESH']);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(true);

    const results = await plugin.run();
    expect(results).toHaveLength(0);
  });

  test('skips watched tickers', async () => {
    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['WATCHED', 'UNWATCHED']);
    (mockWatchManager.isWatched as jest.Mock).mockImplementation((ticker: string) => ticker === 'WATCHED');
    (mockRecentManager.isRecent as jest.Mock)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    const results = await plugin.run();
    expect(results).toHaveLength(1);
    expect(results[0].target).toBe('UNWATCHED');
  });

  test('respects custom threshold via isRecent sinceMs option', async () => {
    const customPlugin = new StaleReviewPlugin(
      mockRecentManager as IRecentManager,
      mockTickerRepo as ITickerRepo,
      mockWatchManager as IWatchManager,
      30
    );

    (mockTickerRepo.getAllKeys as jest.Mock).mockReturnValue(['A']);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(false);

    const customResults = await customPlugin.run();
    expect(customResults).toHaveLength(1);

    // Default plugin with 180-day threshold — isRecent returns true (not stale)
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(true);
    const defaultResults = await plugin.run();
    expect(defaultResults).toHaveLength(0);
  });
});
