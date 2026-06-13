import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { IDomManager } from '../../src/manager/dom';
import { ILifecycleManager } from '../../src/manager/lifecycle';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';
import { SequenceType } from '../../src/models/trading';
import { Ticker } from '../../src/models/ticker';
import { Notifier } from '../../src/util/notify';

// Mock jQuery
const mockJQuery = jest.fn((_selector: string) => ({
  val: jest.fn(),
  css: jest.fn(),
}));
(global as any).$ = mockJQuery;

// Mock Notifier
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
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockDisplayInput: any;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'INVESTINGTICKER',
    pair_id: 'pair1',
    name: 'Test Pair',
    exchange: 'NSE',
    type: 'SECONDARY',
    ticker: 'TVTICKER',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

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

    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
    } as any;

    mockDisplayInput = {
      val: jest.fn(),
      css: jest.fn(),
    };

    mockJQuery.mockReturnValue(mockDisplayInput);

    sequenceHandler = new SequenceHandler(
      mockSequenceManager,
      mockDomManager,
      mockAlertTickerManager,
      mockLifecycleManager
    );
  });

  describe('displaySequence', () => {
    it('should display ticker:sequence when ticker is not mapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('TVTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'maroon');
    });

    it('should display ticker:sequence:PairName when ticker has alert ticker with name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(
        makeAlertTicker({ symbol: 'INVESTINGTICKER', name: 'NIFTY 50', ticker: 'TVTICKER' })
      );

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:YR:NIFTY 50');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'blue');
    });

    it('should display ticker:sequence when no alert ticker name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(
        makeAlertTicker({ symbol: 'INVESTINGTICKER', name: '', ticker: 'TVTICKER' })
      );

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'black');
    });
  });

  describe('handleSequenceSwitch', () => {
    it('should flip sequence and display', async () => {
      mockSequenceManager.flipSequence.mockResolvedValue(undefined);
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);

      await sequenceHandler.handleSequenceSwitch();

      expect(mockSequenceManager.flipSequence).toHaveBeenCalled();
    });
  });

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
