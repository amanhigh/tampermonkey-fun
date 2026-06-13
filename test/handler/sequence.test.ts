import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { IDomManager } from '../../src/manager/dom';
import { ILifecycleManager } from '../../src/manager/lifecycle';
import { IDisplayHandler } from '../../src/handler/display';
import { SequenceType } from '../../src/models/trading';
import { Ticker } from '../../src/models/ticker';
import { Notifier } from '../../src/util/notify';

// ── Mock Notifier ──
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

describe('SequenceHandler', () => {
  let sequenceHandler: SequenceHandler;
  let mockSequenceManager: jest.Mocked<ISequenceManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockLifecycleManager: jest.Mocked<ILifecycleManager>;
  let mockDisplayHandler: jest.Mocked<IDisplayHandler>;

  beforeEach(() => {
    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockResolvedValue(SequenceType.MWD),
      flipSequence: jest.fn().mockResolvedValue(undefined),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDomManager = {
      getTicker: jest.fn(),
      getCurrentExchange: jest.fn(),
      getTickers: jest.fn(),
      isScreenerVisible: jest.fn(),
    } as any;

    mockLifecycleManager = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    } as any;

    mockDisplayHandler = {
      display: jest.fn().mockResolvedValue(undefined),
      resetExpanded: jest.fn(),
    } as any;

    sequenceHandler = new SequenceHandler(
      mockSequenceManager,
      mockDomManager,
      mockLifecycleManager,
      mockDisplayHandler
    );
  });

  // ── handleSequenceSwitch ──

  describe('handleSequenceSwitch', () => {
    it('should flip sequence, reset expanded, and refresh display', async () => {
      mockSequenceManager.flipSequence.mockResolvedValue(undefined);

      await sequenceHandler.handleSequenceSwitch();

      expect(mockSequenceManager.flipSequence).toHaveBeenCalled();
      expect(mockDisplayHandler.resetExpanded).toHaveBeenCalled();
      expect(mockDisplayHandler.display).toHaveBeenCalled();
    });
  });

  // ── startTracking ──

  describe('startTracking', () => {
    it('should start tracking current ticker with MWD sequence timeframes', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockLifecycleManager.startTracking.mockResolvedValue({ ticker: 'TVTICKER' } as Ticker);

      await sequenceHandler.startTracking();

      expect(mockLifecycleManager.startTracking).toHaveBeenCalledWith({
        ticker: 'TVTICKER',
        exchange: 'NSE',
        timeframes: ['MN', 'WK', 'DL'],
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: expect.any(String),
      });
      expect(Notifier.success).toHaveBeenCalledWith('⏺ Started tracking TVTICKER');
    });

    it('should use YR sequence timeframes when current sequence is YR', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockLifecycleManager.startTracking.mockResolvedValue({ ticker: 'TVTICKER' } as Ticker);

      await sequenceHandler.startTracking();

      expect(mockLifecycleManager.startTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframes: ['YR', 'SMN', 'TMN', 'MN', 'WK'],
        })
      );
    });

    it('should warn when start tracking fails', async () => {
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockDomManager.getCurrentExchange.mockReturnValue('NSE');
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockLifecycleManager.startTracking.mockRejectedValue(new Error('Already exists'));

      await sequenceHandler.startTracking();

      expect(Notifier.warn).toHaveBeenCalledWith('Failed to start tracking TVTICKER: Already exists');
    });
  });
});
