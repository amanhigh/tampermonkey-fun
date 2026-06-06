import { StaleReviewPlugin } from '../../src/manager/stale_review_plugin';
import { IRecentManager } from '../../src/manager/recent';
import { ITickerManager } from '../../src/manager/ticker';
import { IWatchManager } from '../../src/manager/watch';
import { Ticker } from '../../src/models/ticker';

describe('StaleReviewPlugin', () => {
  let plugin: StaleReviewPlugin;
  let mockRecentManager: Partial<IRecentManager>;
  let mockTickerManager: Partial<ITickerManager>;
  let mockWatchManager: Partial<IWatchManager>;

  beforeEach(() => {
    mockRecentManager = { isRecent: jest.fn().mockReturnValue(true) };
    mockTickerManager = { listTickers: jest.fn().mockResolvedValue([]) };
    mockWatchManager = { isWatched: jest.fn().mockReturnValue(false) };

    plugin = new StaleReviewPlugin(
      mockRecentManager as IRecentManager,
      mockTickerManager as ITickerManager,
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
    (mockTickerManager.listTickers as jest.Mock).mockResolvedValue([new Ticker({ ticker: 'TCS' }), new Ticker({ ticker: 'INFY' })]);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(false);

    const results = await plugin.run();
    expect(results).toHaveLength(2);
    expect(results[0].severity).toBe('MEDIUM');
    expect(results[0].message).toContain('not recently opened');
  });

  test('skips tickers that are recent', async () => {
    (mockTickerManager.listTickers as jest.Mock).mockResolvedValue([new Ticker({ ticker: 'FRESH' })]);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(true);

    const results = await plugin.run();
    expect(results).toHaveLength(0);
  });

  test('skips watched tickers', async () => {
    (mockTickerManager.listTickers as jest.Mock).mockResolvedValue([new Ticker({ ticker: 'WATCHED' }), new Ticker({ ticker: 'UNWATCHED' })]);
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
      mockTickerManager as ITickerManager,
      mockWatchManager as IWatchManager,
      30
    );

    (mockTickerManager.listTickers as jest.Mock).mockResolvedValue([new Ticker({ ticker: 'A' })]);
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(false);

    const customResults = await customPlugin.run();
    expect(customResults).toHaveLength(1);

    // Default plugin with 180-day threshold — isRecent returns true (not stale)
    (mockRecentManager.isRecent as jest.Mock).mockReturnValue(true);
    const defaultResults = await plugin.run();
    expect(defaultResults).toHaveLength(0);
  });
});
