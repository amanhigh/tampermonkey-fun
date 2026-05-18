import { TickerHandler } from '../../src/handler/ticker';
import { ITickerManager } from '../../src/manager/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { IStyleManager } from '../../src/manager/style';
import { ITickerClient } from '../../src/client/ticker';
import { IAlertTickerHandler } from '../../src/handler/alert_ticker';
import { Notifier } from '../../src/util/notify';

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
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockStyleManager: jest.Mocked<IStyleManager>;
  let mockTickerClient: jest.Mocked<ITickerClient>;
  let mockAlertTickerHandler: jest.Mocked<IAlertTickerHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerManager = {
      getTicker: jest.fn().mockReturnValue('TV_TICKER'),
      openTicker: jest.fn(),
    } as any;

    mockSymbolManager = {
      tvToExchangeTicker: jest.fn().mockImplementation((ticker: string) => Promise.resolve(`EXCHANGE:${ticker}`)),
      deleteTvTicker: jest.fn(),
      setExchange: jest.fn(),
    } as any;

    mockStyleManager = {
      clearAll: jest.fn(),
    } as any;

    mockTickerClient = {
      deleteTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockAlertTickerHandler = {
      linkInvestingTicker: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new TickerHandler(
      mockTickerManager,
      mockSymbolManager,
      mockStyleManager,
      mockTickerClient,
      mockAlertTickerHandler
    );
  });

  describe('openTicker', () => {
    test('opens exchange-qualified ticker and notifies success', async () => {
      await handler.openTicker('TEST');
      expect(mockSymbolManager.tvToExchangeTicker).toHaveBeenCalledWith('TEST');
      expect(mockTickerManager.openTicker).toHaveBeenCalledWith('EXCHANGE:TEST');
      expect(Notifier.success).toHaveBeenCalledWith('Opened EXCHANGE:TEST');
    });
  });

  describe('processCommand', () => {
    test('maps exchange for E command', async () => {
      await handler.processCommand('E', 'NSE');
      expect(mockSymbolManager.setExchange).toHaveBeenCalledWith('TV_TICKER', 'NSE');
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
      mockTickerManager.getTicker.mockReturnValue('TV_TICKER');

      await handler.stopTracking('TV_TICKER');

      expect(mockStyleManager.clearAll).toHaveBeenCalled();
    });

    test('does not clear styles when stopped ticker is not current', async () => {
      mockTickerManager.getTicker.mockReturnValue('OTHER_TICKER');

      await handler.stopTracking('TV_TICKER');

      expect(mockStyleManager.clearAll).not.toHaveBeenCalled();
    });

    test('calls tickerClient.deleteTicker with tvTicker', async () => {
      await handler.stopTracking('TV_TICKER');

      expect(mockTickerClient.deleteTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    test('deletes local TV ticker mapping via symbolManager', async () => {
      await handler.stopTracking('TV_TICKER');

      expect(mockSymbolManager.deleteTvTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    test('warns when backend delete fails', async () => {
      mockTickerClient.deleteTicker.mockRejectedValue(new Error('Network error'));

      await handler.stopTracking('TV_TICKER');

      expect(Notifier.warn).toHaveBeenCalledWith('Failed to delete ticker TV_TICKER: Network error');
      // Should still clean up local mapping
      expect(mockSymbolManager.deleteTvTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    test('notifies success after stop tracking', async () => {
      await handler.stopTracking('TV_TICKER');

      expect(Notifier.success).toHaveBeenCalledWith('⏹ Stopped tracking TV_TICKER');
    });
  });
});
