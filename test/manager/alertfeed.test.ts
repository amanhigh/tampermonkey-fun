import { AlertFeedManager, IAlertFeedManager } from '../../src/manager/alertfeed';
import { IDisplayManager } from '../../src/manager/display';
import { ICategoryManager } from '../../src/manager/category';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { DisplayState } from '../../src/models/display';
import { AlertTicker } from '../../src/models/alert_ticker';
import { TickerCategory } from '../../src/models/category';
import { WatchCategoryId } from '../../src/models/watch';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

const emptyCategory: TickerCategory = { watch: undefined, flag: undefined, tags: [] };

const compositeCategory: TickerCategory = {
  watch: { id: WatchCategoryId.COMPOSITE, color: 'darkkhaki', label: 'Composite', recordUpdate: null },
  flag: undefined,
  tags: [],
};

const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
  symbol: 'INFY',
  pair_id: '12345',
  name: 'Infosys Ltd',
  exchange: 'NSE',
  type: 'PRIMARY',
  ticker: 'TV:INFY',
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('AlertFeedManager', () => {
  let alertFeedManager: IAlertFeedManager;
  let mockDisplayManager: jest.Mocked<IDisplayManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDisplayManager = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<IDisplayManager>;

    mockCategoryManager = {
      getTickerCategory: jest.fn().mockResolvedValue(emptyCategory),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockAlertTickerManager = {
      getAlertTickersForTicker: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IAlertTickerManager>;

    alertFeedManager = new AlertFeedManager(
      mockDisplayManager,
      mockCategoryManager,
      mockAlertTickerManager
    );
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(alertFeedManager).toBeDefined();
      expect(alertFeedManager).toBeInstanceOf(AlertFeedManager);
    });
  });

  describe('createAlertFeedEvent', () => {
    it('should resolve display info via DisplayManager and store event', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.DEFAULT, color: 'white' });

      await alertFeedManager.createAlertFeedEvent('INFY', 'TV:INFY');

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith('TV:INFY');
      expect(GM.setValue).toHaveBeenCalled();
    });

    it('should pass null ticker when ticker is omitted (unmapped)', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      await alertFeedManager.createAlertFeedEvent('UNKNOWN');

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
    });
  });

  describe('createAlertFeedEventsForTicker', () => {
    it('should fan out one event per linked alert ticker sequentially', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.DEFAULT, color: 'white' });
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ symbol: 'INFY', ticker: 'TV:INFY' }),
        makeAlertTicker({ symbol: 'INFY.NS', ticker: 'TV:INFY' }),
      ]);

      await alertFeedManager.createAlertFeedEventsForTicker('TV:INFY');

      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('TV:INFY');
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TV:INFY');
      expect(mockDisplayManager.resolve).toHaveBeenNthCalledWith(1, 'TV:INFY');
      expect(mockDisplayManager.resolve).toHaveBeenNthCalledWith(2, 'TV:INFY');
      expect(GM.setValue).toHaveBeenCalledTimes(2);
    });

    it('should silently skip unmapped tickers with no linked alert tickers', async () => {
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await expect(alertFeedManager.createAlertFeedEventsForTicker('TV:INFY')).resolves.toBeUndefined();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('TV:INFY');
      expect(mockDisplayManager.resolve).not.toHaveBeenCalled();
      expect(GM.setValue).not.toHaveBeenCalled();
    });

    it('should silently skip composite tickers without resolving alert tickers', async () => {
      mockCategoryManager.getTickerCategory.mockResolvedValue(compositeCategory);

      await alertFeedManager.createAlertFeedEventsForTicker('SENSEX/USDINR/XAUUSD');

      expect(mockCategoryManager.getTickerCategory).toHaveBeenCalledWith('SENSEX/USDINR/XAUUSD');
      expect(mockAlertTickerManager.getAlertTickersForTicker).not.toHaveBeenCalled();
      expect(GM.setValue).not.toHaveBeenCalled();
    });

    it('should propagate GM write rejection and stop remaining fan-out', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.DEFAULT, color: 'white' });
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([
        makeAlertTicker({ symbol: 'INFY', ticker: 'TV:INFY' }),
        makeAlertTicker({ symbol: 'INFY.NS', ticker: 'TV:INFY' }),
      ]);
      (GM.setValue as jest.Mock).mockRejectedValueOnce(new Error('write failed'));

      await expect(alertFeedManager.createAlertFeedEventsForTicker('TV:INFY')).rejects.toThrow(
        'write failed'
      );

      expect(GM.setValue).toHaveBeenCalledTimes(1);
      expect(mockDisplayManager.resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe('createResetFeedEvent', () => {
    it('should resolve DISPLAY state for null ticker and store reset event', async () => {
      mockDisplayManager.resolve.mockResolvedValue({ state: DisplayState.UNMAPPED, color: 'firebrick' });

      await alertFeedManager.createResetFeedEvent();

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith(null);
      expect(GM.setValue).toHaveBeenCalled();
    });
  });
});
