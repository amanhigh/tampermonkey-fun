import { TickerHandler } from '../../src/handler/ticker';
import { IDomManager } from '../../src/manager/dom';
import { ITickerManager } from '../../src/manager/ticker';
import { ILifecycleManager } from '../../src/manager/lifecycle';
import { IStyleManager } from '../../src/manager/style';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { Notifier } from '../../src/util/notify';
import { Ticker } from '../../src/models/ticker';

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

describe('TickerHandler', () => {
  let handler: TickerHandler;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockStyleManager: jest.Mocked<IStyleManager>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockLifecycleManager: jest.Mocked<ILifecycleManager>;
  let mockAlertTickerHandler: jest.Mocked<IAlertTickerHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TV_TICKER'),
      openTicker: jest.fn(),
    } as any;

    mockStyleManager = {
      clearAll: jest.fn(),
    } as any;

    mockTickerManager = {
      getTicker: jest.fn(),
      updateTicker: jest.fn(),
      markRecent: jest.fn(),
      listTickers: jest.fn(),
      setExchange: jest.fn(),
    } as unknown as jest.Mocked<ITickerManager>;

    mockLifecycleManager = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    } as any;

    mockAlertTickerHandler = {
      linkInvestingTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new TickerHandler(
      mockDomManager,
      mockStyleManager,
      mockTickerManager,
      mockLifecycleManager,
      mockAlertTickerHandler
    );
  });

  describe('openTicker', () => {
    test('opens exchange-qualified ticker and notifies success', async () => {
      mockTickerManager.getTicker.mockResolvedValue({ qualifiedName: 'EXCHANGE:TEST' } as Ticker);

      await handler.openTicker('TEST');

      expect(mockTickerManager.getTicker).toHaveBeenCalledWith('TEST');
      expect(mockDomManager.openTicker).toHaveBeenCalledWith('EXCHANGE:TEST');
      expect(Notifier.success).toHaveBeenCalledWith('Opened EXCHANGE:TEST');
    });

    test('falls back to raw ticker when backend lookup fails', async () => {
      mockTickerManager.getTicker.mockRejectedValue(new Error('Not found'));

      await handler.openTicker('UNKNOWN');

      expect(mockDomManager.openTicker).toHaveBeenCalledWith('UNKNOWN');
      expect(Notifier.success).toHaveBeenCalledWith('Opened UNKNOWN');
    });
  });

  describe('processCommand', () => {
    test('maps exchange for E command', async () => {
      mockTickerManager.setExchange.mockResolvedValue({} as Ticker);

      await handler.processCommand('E', 'NSE');

      expect(mockTickerManager.setExchange).toHaveBeenCalledWith('TV_TICKER', 'NSE');
      expect(Notifier.success).toHaveBeenCalledWith('Mapped TV_TICKER to Exchange NSE');
    });

    test('calls alertTickerHandler.linkInvestingTicker for P command', async () => {
      await handler.processCommand('P', 'INFY');
      expect(mockAlertTickerHandler.linkInvestingTicker).toHaveBeenCalledWith('INFY');
    });

    test('throws for unsupported command action', async () => {
      await expect(handler.processCommand('X', 'value')).rejects.toThrow('Unsupported command action: X');
    });
  });

  describe('stopTracking', () => {
    test('clears styles when stopped ticker matches current chart ticker', async () => {
      mockDomManager.getTicker.mockReturnValue('TV_TICKER');
      mockLifecycleManager.stopTracking.mockResolvedValue(undefined);

      await handler.stopTracking('TV_TICKER');

      expect(mockStyleManager.clearAll).toHaveBeenCalled();
    });

    test('does not clear styles when stopped ticker is not current', async () => {
      mockDomManager.getTicker.mockReturnValue('OTHER_TICKER');
      mockLifecycleManager.stopTracking.mockResolvedValue(undefined);

      await handler.stopTracking('TV_TICKER');

      expect(mockStyleManager.clearAll).not.toHaveBeenCalled();
    });

    test('calls lifecycleManager.stopTracking with tvTicker', async () => {
      mockLifecycleManager.stopTracking.mockResolvedValue(undefined);

      await handler.stopTracking('TV_TICKER');

      expect(mockLifecycleManager.stopTracking).toHaveBeenCalledWith('TV_TICKER');
    });

    test('warns when backend delete fails', async () => {
      mockLifecycleManager.stopTracking.mockRejectedValue(new Error('Network error'));

      await handler.stopTracking('TV_TICKER');

      expect(Notifier.warn).toHaveBeenCalledWith('Failed to delete ticker TV_TICKER: Network error');
    });

    test('notifies success after stop tracking', async () => {
      mockLifecycleManager.stopTracking.mockResolvedValue(undefined);

      await handler.stopTracking('TV_TICKER');

      expect(Notifier.success).toHaveBeenCalledWith('⏹ Stopped tracking TV_TICKER');
    });
  });
});
