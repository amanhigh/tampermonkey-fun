import { KeyConfig, IKeyConfig } from '../../src/handler/key_config';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { IWatchListHandler } from '../../src/handler/watchlist';
import { IFlagHandler } from '../../src/handler/flag';
import { IStyleManager } from '../../src/manager/style';
import { IJournalHandler } from '../../src/handler/journal';
import { IKiteHandler } from '../../src/handler/kite';

describe('KeyConfig', () => {
  let keyConfig: IKeyConfig;
  let mockWatchlistHandler: jest.Mocked<IWatchListHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWatchlistHandler = {
      registerEvents: jest.fn(),
      onWatchListChange: jest.fn(),
      recordSelectedTicker: jest.fn(),
      toggleReadyForSelectedTickers: jest.fn(),
    } as unknown as jest.Mocked<IWatchListHandler>;

    const mockTimeFrameManager = {} as unknown as jest.Mocked<ITimeFrameManager>;
    const mockFlagHandler = { recordSelectedTicker: jest.fn() } as unknown as jest.Mocked<IFlagHandler>;
    const mockStyleManager = {} as unknown as jest.Mocked<IStyleManager>;
    const mockJournalHandler = {} as unknown as jest.Mocked<IJournalHandler>;
    const mockKiteHandler = {} as unknown as jest.Mocked<IKiteHandler>;

    keyConfig = new KeyConfig(
      mockTimeFrameManager,
      mockWatchlistHandler,
      mockFlagHandler,
      mockStyleManager,
      mockJournalHandler,
      mockKiteHandler
    );
  });

  describe('executeOrderAction', () => {
    it('should execute F2 as Toggle Ready', () => {
      const result = keyConfig.executeOrderAction('F2');

      expect(result).toBe(true);
      expect(mockWatchlistHandler.toggleReadyForSelectedTickers).toHaveBeenCalledTimes(1);
    });

    it('should return false for unmapped order key', () => {
      const result = keyConfig.executeOrderAction('F3');

      expect(result).toBe(false);
      expect(mockWatchlistHandler.toggleReadyForSelectedTickers).not.toHaveBeenCalled();
    });
  });
});
