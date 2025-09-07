import { SequenceManager, ISequenceManager } from '../../src/manager/sequence';
import { ISequenceRepo } from '../../src/repo/sequence';
import { ITickerManager } from '../../src/manager/ticker';
import { SequenceType, TimeFrame } from '../../src/models/trading';
import { Constants } from '../../src/models/constant';
import { Notifier } from '../../src/util/notify';
import { Color } from '../../src/models/color';

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
  let mockSequenceRepo: jest.Mocked<ISequenceRepo>;
  let mockTickerManager: jest.Mocked<ITickerManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SequenceRepo
    mockSequenceRepo = {
      getSequence: jest.fn().mockReturnValue(SequenceType.MWD),
      pinSequence: jest.fn(),
      getAllItems: jest.fn(),
      getCategory: jest.fn(),
      getCategoryCount: jest.fn(),
      addToCategory: jest.fn(),
      removeFromCategory: jest.fn(),
      getAllKeys: jest.fn(),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
    } as unknown as jest.Mocked<ISequenceRepo>;

    // Mock TickerManager
    mockTickerManager = {
      getTicker: jest.fn().mockReturnValue('AAPL'),
      getCurrentExchange: jest.fn().mockReturnValue('NSE'),
      setTicker: jest.fn(),
      updateTicker: jest.fn(),
      resetTicker: jest.fn(),
      buildTickerSymbol: jest.fn(),
      parseTickerSymbol: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    sequenceManager = new SequenceManager(mockSequenceRepo, mockTickerManager);
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(sequenceManager).toBeInstanceOf(SequenceManager);
    });

    it('should initialize with no frozen sequence', () => {
      // Fresh instance should return sequence from repo, not frozen
      sequenceManager.getCurrentSequence();
      expect(mockSequenceRepo.getSequence).toHaveBeenCalled();
    });
  });

  describe('getCurrentSequence', () => {
    it('should return frozen sequence when set', () => {
      // First, freeze a sequence
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence(); // This will freeze current sequence (YR)

      // Clear mock calls from freeze operation
      mockSequenceRepo.getSequence.mockClear();

      // Now getCurrentSequence should return frozen sequence without calling repo
      const result = sequenceManager.getCurrentSequence();

      expect(result).toBe(SequenceType.YR);
      expect(mockSequenceRepo.getSequence).not.toHaveBeenCalled();
    });

    it('should get sequence from repo when not frozen with NSE exchange', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NSE');
      mockTickerManager.getTicker.mockReturnValue('RELIANCE');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      const result = sequenceManager.getCurrentSequence();

      expect(mockTickerManager.getTicker).toHaveBeenCalled();
      expect(mockTickerManager.getCurrentExchange).toHaveBeenCalled();
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('RELIANCE', SequenceType.MWD);
      expect(result).toBe(SequenceType.MWD);
    });

    it('should get sequence from repo when not frozen with non-NSE exchange', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NASDAQ');
      mockTickerManager.getTicker.mockReturnValue('AAPL');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);

      const result = sequenceManager.getCurrentSequence();

      expect(mockTickerManager.getTicker).toHaveBeenCalled();
      expect(mockTickerManager.getCurrentExchange).toHaveBeenCalled();
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('AAPL', SequenceType.YR);
      expect(result).toBe(SequenceType.YR);
    });

    it('should use MWD as default for NSE exchange', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NSE');
      mockTickerManager.getTicker.mockReturnValue('TCS');

      sequenceManager.getCurrentSequence();

      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('TCS', SequenceType.MWD);
    });

    it('should use YR as default for non-NSE exchange', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('AMEX');
      mockTickerManager.getTicker.mockReturnValue('SPY');

      sequenceManager.getCurrentSequence();

      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('SPY', SequenceType.YR);
    });

    it('should handle empty exchange gracefully', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('');
      mockTickerManager.getTicker.mockReturnValue('TEST');

      sequenceManager.getCurrentSequence();

      // Empty exchange should default to YR (non-NSE behavior)
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('TEST', SequenceType.YR);
    });

    it('should handle case-sensitive exchange comparison', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('nse'); // lowercase
      mockTickerManager.getTicker.mockReturnValue('HDFC');

      sequenceManager.getCurrentSequence();

      // Should default to YR since 'nse' != 'NSE'
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('HDFC', SequenceType.YR);
    });
  });

  describe('flipSequence', () => {
    it('should flip from MWD to YR', () => {
      mockTickerManager.getTicker.mockReturnValue('GOOGL');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      sequenceManager.flipSequence();

      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('GOOGL', SequenceType.YR);
    });

    it('should flip from YR to MWD', () => {
      mockTickerManager.getTicker.mockReturnValue('MSFT');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);

      sequenceManager.flipSequence();

      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('MSFT', SequenceType.MWD);
    });

    it('should work with frozen sequences', () => {
      // Set up frozen sequence as YR
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence();

      mockTickerManager.getTicker.mockReturnValue('TSLA');

      sequenceManager.flipSequence();

      // Should flip the frozen YR to MWD
      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('TSLA', SequenceType.MWD);
    });

    it('should handle special ticker symbols', () => {
      mockTickerManager.getTicker.mockReturnValue('BRK-B');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      sequenceManager.flipSequence();

      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('BRK-B', SequenceType.YR);
    });

    it('should handle empty ticker gracefully', () => {
      mockTickerManager.getTicker.mockReturnValue('');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      sequenceManager.flipSequence();

      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('', SequenceType.YR);
    });
  });

  describe('sequenceToTimeFrameConfig', () => {
    it('should return correct config for MWD sequence position 0', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 0);

      // MWD[0] = THREE_MONTHLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.THREE_MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('TMN');
      expect(result.toolbar).toBe(5);
    });

    it('should return correct config for MWD sequence position 1', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 1);

      // MWD[1] = MONTHLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('MN');
      expect(result.toolbar).toBe(4);
    });

    it('should return correct config for MWD sequence position 2', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 2);

      // MWD[2] = WEEKLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('WK');
      expect(result.toolbar).toBe(3);
    });

    it('should return correct config for MWD sequence position 3', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 3);

      // MWD[3] = DAILY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.DAILY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('D');
      expect(result.toolbar).toBe(2);
    });

    it('should return correct config for YR sequence position 0', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 0);

      // YR[0] = SIX_MONTHLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.SIX_MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('SMN');
      expect(result.toolbar).toBe(6);
    });

    it('should return correct config for YR sequence position 1', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 1);

      // YR[1] = THREE_MONTHLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.THREE_MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('TMN');
      expect(result.toolbar).toBe(5);
    });

    it('should return correct config for YR sequence position 2', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 2);

      // YR[2] = MONTHLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('MN');
      expect(result.toolbar).toBe(4);
    });

    it('should return correct config for YR sequence position 3', () => {
      const result = sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 3);

      // YR[3] = WEEKLY
      const expected = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.WEEKLY];
      expect(result).toBe(expected);
      expect(result.symbol).toBe('WK');
      expect(result.toolbar).toBe(3);
    });

    it('should throw error for invalid position in MWD sequence', () => {
      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 4);
      }).toThrow('Invalid sequence or position: sequence=MWD, position=4');
    });

    it('should throw error for invalid position in YR sequence', () => {
      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, -1);
      }).toThrow('Invalid sequence or position: sequence=YR, position=-1');
    });

    it('should throw error for invalid position 999', () => {
      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 999);
      }).toThrow('Invalid sequence or position: sequence=MWD, position=999');
    });

    it('should handle edge case positions', () => {
      // Test boundary positions
      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 4);
      }).toThrow('Invalid sequence or position: sequence=YR, position=4');

      expect(() => {
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, -2);
      }).toThrow('Invalid sequence or position: sequence=MWD, position=-2');
    });
  });

  describe('toggleFreezeSequence', () => {
    it('should freeze sequence when not frozen', () => {
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      sequenceManager.toggleFreezeSequence();

      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: MWD', Color.ROYAL_BLUE);

      // Verify sequence is now frozen
      expect(sequenceManager.getCurrentSequence()).toBe(SequenceType.MWD);
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledTimes(1); // Only called during freeze
    });

    it('should unfreeze sequence when already frozen', () => {
      // First freeze
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence();

      // Clear previous calls
      jest.clearAllMocks();
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      // Then unfreeze
      sequenceManager.toggleFreezeSequence();

      expect(Notifier.red).toHaveBeenCalledWith('🚫 FreezeSequence Disabled');

      // Verify sequence is now unfrozen - should call repo
      const result = sequenceManager.getCurrentSequence();
      expect(mockSequenceRepo.getSequence).toHaveBeenCalled();
      expect(result).toBe(SequenceType.MWD);
    });

    it('should freeze YR sequence correctly', () => {
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);

      sequenceManager.toggleFreezeSequence();

      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: YR', Color.ROYAL_BLUE);

      // Verify frozen state
      const result = sequenceManager.getCurrentSequence();
      expect(result).toBe(SequenceType.YR);
    });

    it('should handle multiple freeze/unfreeze cycles', () => {
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      // Freeze
      sequenceManager.toggleFreezeSequence();
      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: MWD', Color.ROYAL_BLUE);

      // Unfreeze
      sequenceManager.toggleFreezeSequence();
      expect(Notifier.red).toHaveBeenCalledWith('🚫 FreezeSequence Disabled');

      // Freeze again
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence();
      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: YR', Color.ROYAL_BLUE);

      // Verify final state
      const result = sequenceManager.getCurrentSequence();
      expect(result).toBe(SequenceType.YR);
    });

    it('should maintain frozen state across other operations', () => {
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence();

      // Clear mocks to verify frozen state is maintained
      mockSequenceRepo.getSequence.mockClear();

      // These operations should use frozen sequence
      const result1 = sequenceManager.getCurrentSequence();
      const result2 = sequenceManager.getCurrentSequence();

      expect(result1).toBe(SequenceType.YR);
      expect(result2).toBe(SequenceType.YR);
      expect(mockSequenceRepo.getSequence).not.toHaveBeenCalled();
    });
  });

  describe('_getDefaultSequence (private method behavior)', () => {
    it('should return MWD for NSE exchange through getCurrentSequence', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NSE');
      mockTickerManager.getTicker.mockReturnValue('ICICI');

      sequenceManager.getCurrentSequence();

      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('ICICI', SequenceType.MWD);
    });

    it('should return YR for non-NSE exchanges through getCurrentSequence', () => {
      const testExchanges = ['NASDAQ', 'NYSE', 'AMEX', 'LSE', 'TSE', ''];

      testExchanges.forEach((exchange) => {
        mockTickerManager.getCurrentExchange.mockReturnValue(exchange);
        mockTickerManager.getTicker.mockReturnValue('TEST');

        sequenceManager.getCurrentSequence();

        expect(mockSequenceRepo.getSequence).toHaveBeenLastCalledWith('TEST', SequenceType.YR);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete sequence management workflow', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NSE');
      mockTickerManager.getTicker.mockReturnValue('RELIANCE');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      // Get current sequence (should be MWD from repo)
      let current = sequenceManager.getCurrentSequence();
      expect(current).toBe(SequenceType.MWD);
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledWith('RELIANCE', SequenceType.MWD);

      // Flip sequence (MWD -> YR)
      sequenceManager.flipSequence();
      expect(mockSequenceRepo.pinSequence).toHaveBeenCalledWith('RELIANCE', SequenceType.YR);

      // Freeze current sequence
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.YR);
      sequenceManager.toggleFreezeSequence();
      expect(Notifier.message).toHaveBeenCalledWith('FreezeSequence: YR', Color.ROYAL_BLUE);

      // Verify frozen state
      mockSequenceRepo.getSequence.mockClear();
      current = sequenceManager.getCurrentSequence();
      expect(current).toBe(SequenceType.YR);
      expect(mockSequenceRepo.getSequence).not.toHaveBeenCalled();

      // Unfreeze
      sequenceManager.toggleFreezeSequence();
      expect(Notifier.red).toHaveBeenCalledWith('🚫 FreezeSequence Disabled');
    });

    it('should handle sequence config retrieval for trading workflow', () => {
      // Test complete MWD sequence
      const mwdConfigs = [
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 0), // THREE_MONTHLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 1), // MONTHLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 2), // WEEKLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.MWD, 3), // DAILY
      ];

      expect(mwdConfigs[0].symbol).toBe('TMN');
      expect(mwdConfigs[1].symbol).toBe('MN');
      expect(mwdConfigs[2].symbol).toBe('WK');
      expect(mwdConfigs[3].symbol).toBe('D');

      // Test complete YR sequence
      const yrConfigs = [
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 0), // SIX_MONTHLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 1), // THREE_MONTHLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 2), // MONTHLY
        sequenceManager.sequenceToTimeFrameConfig(SequenceType.YR, 3), // WEEKLY
      ];

      expect(yrConfigs[0].symbol).toBe('SMN');
      expect(yrConfigs[1].symbol).toBe('TMN');
      expect(yrConfigs[2].symbol).toBe('MN');
      expect(yrConfigs[3].symbol).toBe('WK');

      // Verify toolbar positions are unique and valid
      const allToolbarPositions = [...mwdConfigs, ...yrConfigs].map((config) => config.toolbar);
      expect(new Set(allToolbarPositions).size).toBe(5); // Should have 5 unique positions
    });

    it('should handle edge cases gracefully', () => {
      // Test with unusual tickers
      const unusualTickers = ['', '123', 'A', 'VERY-LONG-TICKER-NAME', '中文股票'];

      unusualTickers.forEach((ticker) => {
        mockTickerManager.getTicker.mockReturnValue(ticker);
        mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

        sequenceManager.flipSequence();

        expect(mockSequenceRepo.pinSequence).toHaveBeenLastCalledWith(ticker, SequenceType.YR);
      });
    });

    it('should maintain state consistency across operations', () => {
      mockTickerManager.getCurrentExchange.mockReturnValue('NSE');
      mockTickerManager.getTicker.mockReturnValue('TCS');
      mockSequenceRepo.getSequence.mockReturnValue(SequenceType.MWD);

      // Freeze sequence
      sequenceManager.toggleFreezeSequence();

      // Multiple operations should maintain frozen state
      for (let i = 0; i < 5; i++) {
        const result = sequenceManager.getCurrentSequence();
        expect(result).toBe(SequenceType.MWD);
      }

      // Should only call repo once during initial freeze
      expect(mockSequenceRepo.getSequence).toHaveBeenCalledTimes(1);
    });
  });
});
