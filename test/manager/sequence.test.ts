import { SequenceManager, ISequenceManager } from '../../src/manager/sequence';
import { ITickerClient } from '../../src/client/ticker';
import { IDomManager } from '../../src/manager/dom';
import { SequenceType, TimeFrame } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';
import { Color } from '../../src/models/color';
import { Ticker } from '../../src/models/ticker';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    yellow: jest.fn(),
    message: jest.fn(),
  },
}));

describe('SequenceManager', () => {
  let sequenceManager: ISequenceManager;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockDomManager: jest.Mocked<IDomManager>;

  const createMockTicker = (overrides: Partial<Ticker> = {}): Ticker => new Ticker({
    ticker: 'TEST',
    exchange: 'NSE',
    timeframes: ['MN', 'WK', 'DL'],
    type: 'EQUITY',
    state: 'WATCHED',
    trend: 'UPTREND',
    last_opened_at: '2024-01-01T00:00:00Z',
    is_fno: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock TickerClient
    mockTickerClient = {
      getTicker: jest.fn(),
      updateTicker: jest.fn().mockResolvedValue(undefined),
      listAllTickers: jest.fn(),
      createTicker: jest.fn(),
      patchTickerLastOpened: jest.fn(),
      deleteTicker: jest.fn(),
      getBaseUrl: jest.fn(),
    } as unknown as jest.Mocked<ITickerClient>;

    // Mock DomManager
    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('AAPL'),
      getCurrentExchange: jest.fn().mockReturnValue('NSE'),
      openTicker: jest.fn(),
      getSelectedTickers: jest.fn(),
      navigateTickers: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      getInvestingTicker: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    sequenceManager = new SequenceManager(mockTickerClient, mockDomManager);
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(sequenceManager).toBeInstanceOf(SequenceManager);
    });
  });

  describe('getCurrentSequence', () => {
    it('should return frozen sequence when set', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['MN', 'WK', 'DL'] }));
      await sequenceManager.toggleFreezeSequence(); // freeze from MWD

      mockTickerClient.getTicker.mockClear();

      const result = await sequenceManager.getCurrentSequence();
      expect(result).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).not.toHaveBeenCalled();
    });

    it('should return MWD when backend timeframes include DL', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['MN', 'WK', 'DL'] }));
      mockDomManager.getTicker.mockReturnValue('RELIANCE');

      const result = await sequenceManager.getCurrentSequence();

      expect(mockTickerClient.getTicker).toHaveBeenCalledWith('RELIANCE');
      expect(result).toBe(SequenceType.MWD);
    });

    it('should return YR when backend timeframes exclude DL', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] }));
      mockDomManager.getTicker.mockReturnValue('AAPL');

      const result = await sequenceManager.getCurrentSequence();

      expect(mockTickerClient.getTicker).toHaveBeenCalledWith('AAPL');
      expect(result).toBe(SequenceType.YR);
    });

    it('should default to MWD when backend read fails', async () => {
      mockTickerClient.getTicker.mockRejectedValue(new Error('Not found'));
      mockDomManager.getTicker.mockReturnValue('UNKNOWN');

      const result = await sequenceManager.getCurrentSequence();

      expect(result).toBe(SequenceType.MWD);
    });
  });

  describe('flipSequence', () => {
    it('should flip from MWD timeframes to YR timeframes', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({
        ticker: 'GOOGL',
        timeframes: ['MN', 'WK', 'DL'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockDomManager.getTicker.mockReturnValue('GOOGL');

      await sequenceManager.flipSequence();

      // updateTicker receives exchange (from fetched ticker) + changed timeframes
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('GOOGL', {
        exchange: 'NASDAQ',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
      });
    });

    it('should flip from YR timeframes to MWD timeframes', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({
        ticker: 'MSFT',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockDomManager.getTicker.mockReturnValue('MSFT');

      await sequenceManager.flipSequence();

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('MSFT', {
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK', 'DL'],
      });
    });

    it('should silently handle backend update failure on flip', async () => {
      // getCurrentSequence succeeds (returns MWD), exchange lookup succeeds,
      // but updateTicker fails — the catch in flipSequence swallows the error
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({
        ticker: 'NONEXISTENT',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
      }));
      mockDomManager.getTicker.mockReturnValue('NONEXISTENT');

      // Override updateTicker to fail
      mockTickerClient.updateTicker.mockRejectedValue(new Error('Backend error'));

      await expect(sequenceManager.flipSequence()).resolves.toBeUndefined();
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('NONEXISTENT', {
        exchange: 'NSE',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
      });
    });

    it('should work with frozen sequences', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({
        ticker: 'TSLA',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockDomManager.getTicker.mockReturnValue('TSLA');

      // Freeze YR sequence first
      await sequenceManager.toggleFreezeSequence();

      // Flip should still work and persist to backend
      // When frozen, getCurrentSequence returns YR, so flip should set MWD
      mockTickerClient.getTicker.mockClear();
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({
        ticker: 'TSLA',
        exchange: 'NASDAQ',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
      }));
      await sequenceManager.flipSequence();

      // With freeze active, getCurrentSequence returns frozen value, but flipSequence
      // still calls updateTicker with exchange + changed timeframes
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TSLA', {
        exchange: 'NASDAQ',
        timeframes: ['MN', 'WK', 'DL'],
      });
    });
  });

  describe('sequenceToTimeFrameConfig', () => {
    it('should return correct config for MWD sequence position 0', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 0);

      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.THREE_MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('TMN');
      expect(result.toolbar).toBe(5);
    });

    it('should return correct config for MWD sequence position 1', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 1);

      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('MN');
      expect(result.toolbar).toBe(4);
    });

    it('should return correct config for YR sequence position 0', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 0);

      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.SIX_MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('SMN');
      expect(result.toolbar).toBe(6);
    });

    it('should throw error for invalid position', () => {
      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 4);
      }).toThrow('Invalid sequence or position: sequence=MWD, position=4');

      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, -1);
      }).toThrow('Invalid sequence or position: sequence=YR, position=-1');
    });
  });

  describe('toggleFreezeSequence', () => {
    it('should freeze sequence when not frozen', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['MN', 'WK', 'DL'] }));
      mockDomManager.getTicker.mockReturnValue('RELIANCE');

      await sequenceManager.toggleFreezeSequence();

      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: MWD', Color.ROYAL_BLUE);

      // Verify sequence is now frozen (returns frozen value without backend call)
      mockTickerClient.getTicker.mockClear();
      const frozenResult = await sequenceManager.getCurrentSequence();
      expect(frozenResult).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).not.toHaveBeenCalled();
    });

    it('should unfreeze sequence when already frozen', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] }));
      await sequenceManager.toggleFreezeSequence(); // freeze YR

      jest.clearAllMocks();

      await sequenceManager.toggleFreezeSequence();

      expect(Notifier.red).toHaveBeenCalledWith('\u{1F6AB} FreezeSequence Disabled');

      // After unfreeze, getCurrentSequence should call backend again
      mockTickerClient.getTicker.mockResolvedValue(createMockTicker({ timeframes: ['MN', 'WK', 'DL'] }));
      const unfrozenResult = await sequenceManager.getCurrentSequence();
      expect(unfrozenResult).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).toHaveBeenCalled();
    });
  });
});
