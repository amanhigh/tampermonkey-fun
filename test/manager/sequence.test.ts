import { SequenceManager, ISequenceManager } from '../../src/manager/sequence';
import { ITickerClient } from '../../src/client/ticker';
import { IDomManager } from '../../src/manager/dom';
import { SequenceType, TimeFrame } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';
import { Color } from '../../src/models/color';
import { TickerRecord } from '../../src/models/ticker';

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
  let mockTickerManager: jest.Mocked<IDomManager>;

  const createMockRecord = (overrides: Partial<TickerRecord> = {}): TickerRecord => ({
    ticker: 'TEST',
    exchange: 'NSE',
    timeframes: ['MN', 'WK', 'DL'],
    type: 'EQUITY',
    state: 'WATCHED',
    trend: 'UPTREND',
    last_opened_at: '2024-01-01T00:00:00Z',
    is_fno: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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
    mockTickerManager = {
      getTicker: jest.fn().mockReturnValue('AAPL'),
      getCurrentExchange: jest.fn().mockReturnValue('NSE'),
      setTicker: jest.fn(),
      updateTicker: jest.fn(),
      resetTicker: jest.fn(),
      buildTickerSymbol: jest.fn(),
      parseTickerSymbol: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    sequenceManager = new SequenceManager(mockTickerClient, mockTickerManager);
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(sequenceManager).toBeInstanceOf(SequenceManager);
    });
  });

  describe('getCurrentSequence', () => {
    it('should return frozen sequence when set', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['MN', 'WK', 'DL'] }));
      await sequenceManager.toggleFreezeSequence(); // freeze from MWD

      mockTickerClient.getTicker.mockClear();

      const result = await sequenceManager.getCurrentSequence();
      expect(result).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).not.toHaveBeenCalled();
    });

    it('should return MWD when backend timeframes include DL', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['MN', 'WK', 'DL'] }));
      mockTickerManager.getTicker.mockReturnValue('RELIANCE');

      const result = await sequenceManager.getCurrentSequence();

      expect(mockTickerClient.getTicker).toHaveBeenCalledWith('RELIANCE');
      expect(result).toBe(SequenceType.MWD);
    });

    it('should return YR when backend timeframes exclude DL', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] }));
      mockTickerManager.getTicker.mockReturnValue('AAPL');

      const result = await sequenceManager.getCurrentSequence();

      expect(mockTickerClient.getTicker).toHaveBeenCalledWith('AAPL');
      expect(result).toBe(SequenceType.YR);
    });

    it('should default to MWD when backend read fails', async () => {
      mockTickerClient.getTicker.mockRejectedValue(new Error('Not found'));
      mockTickerManager.getTicker.mockReturnValue('UNKNOWN');

      const result = await sequenceManager.getCurrentSequence();

      expect(result).toBe(SequenceType.MWD);
    });
  });

  describe('flipSequence', () => {
    it('should flip from MWD timeframes to YR timeframes', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({
        ticker: 'GOOGL',
        timeframes: ['MN', 'WK', 'DL'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockTickerManager.getTicker.mockReturnValue('GOOGL');

      await sequenceManager.flipSequence();

      // updateTicker receives only the changed field; it merges internally
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('GOOGL', {
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
      });
    });

    it('should flip from YR timeframes to MWD timeframes', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({
        ticker: 'MSFT',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockTickerManager.getTicker.mockReturnValue('MSFT');

      await sequenceManager.flipSequence();

      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('MSFT', {
        timeframes: ['MN', 'WK', 'DL'],
      });
    });

    it('should silently handle backend update failure on flip', async () => {
      // getCurrentSequence fails → returns MWD default → flip computes YR timeframes
      mockTickerClient.getTicker.mockRejectedValue(new Error('Not found'));
      mockTickerManager.getTicker.mockReturnValue('NONEXISTENT');

      // updateTicker is called but its internal GET also fails — the catch in
      // flipSequence swallows the error
      await expect(sequenceManager.flipSequence()).resolves.toBeUndefined();
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('NONEXISTENT', {
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
      });
    });

    it('should work with frozen sequences', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({
        ticker: 'TSLA',
        timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        exchange: 'NASDAQ',
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'UPTREND',
        is_fno: false,
      }));
      mockTickerManager.getTicker.mockReturnValue('TSLA');

      // Freeze YR sequence first
      await sequenceManager.toggleFreezeSequence();

      // Flip should still work and persist to backend
      // When frozen, getCurrentSequence returns YR, so flip should set MWD
      mockTickerClient.getTicker.mockClear();
      await sequenceManager.flipSequence();

      // With freeze active, getCurrentSequence returns frozen value, but flipSequence
      // still calls updateTicker with partial timeframes
      expect(mockTickerClient.updateTicker).toHaveBeenCalledWith('TSLA', {
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
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['MN', 'WK', 'DL'] }));
      mockTickerManager.getTicker.mockReturnValue('RELIANCE');

      await sequenceManager.toggleFreezeSequence();

      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: MWD', Color.ROYAL_BLUE);

      // Verify sequence is now frozen (returns frozen value without backend call)
      mockTickerClient.getTicker.mockClear();
      const frozenResult = await sequenceManager.getCurrentSequence();
      expect(frozenResult).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).not.toHaveBeenCalled();
    });

    it('should unfreeze sequence when already frozen', async () => {
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'] }));
      await sequenceManager.toggleFreezeSequence(); // freeze YR

      jest.clearAllMocks();

      await sequenceManager.toggleFreezeSequence();

      expect(Notifier.red).toHaveBeenCalledWith('🚫 FreezeSequence Disabled');

      // After unfreeze, getCurrentSequence should call backend again
      mockTickerClient.getTicker.mockResolvedValue(createMockRecord({ timeframes: ['MN', 'WK', 'DL'] }));
      const unfrozenResult = await sequenceManager.getCurrentSequence();
      expect(unfrozenResult).toBe(SequenceType.MWD);
      expect(mockTickerClient.getTicker).toHaveBeenCalled();
    });
  });
});
