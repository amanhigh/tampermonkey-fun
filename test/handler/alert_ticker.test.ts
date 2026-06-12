import { AlertTickerHandler } from '../../src/handler/alert_ticker';
import { IInvestingClient } from '../../src/client/investing';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ISmartPrompt } from '../../src/util/smart';
import { IDomManager } from '../../src/manager/dom';
import { PairInfo } from '../../src/models/alert';

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

describe('AlertTickerHandler', () => {
  let handler: AlertTickerHandler;
  let mockInvestingClient: jest.Mocked<IInvestingClient>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockSmartPrompt: jest.Mocked<ISmartPrompt>;
  let mockDomManager: jest.Mocked<IDomManager>;

  const mockPairs: PairInfo[] = [
    new PairInfo('Infosys Ltd', 'pair1', 'NSE', 'INFY'),
    new PairInfo('Infosys - CDR', 'pair2', 'XPAR', 'INFY.PA'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvestingClient = {
      fetchSymbolData: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      linkAlertTicker: jest.fn().mockResolvedValue({} as any),
      getAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as any;

    mockSmartPrompt = {
      showModal: jest.fn(),
    } as any;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TV_TICKER'),
    } as any;

    handler = new AlertTickerHandler(
      mockInvestingClient,
      mockAlertTickerManager,
      mockSmartPrompt,
      mockDomManager
    );
  });

  describe('linkInvestingTicker', () => {
    test('searches Investing symbols and shows top 10 options', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockInvestingClient.fetchSymbolData).toHaveBeenCalledWith('INFY');
      expect(mockSmartPrompt.showModal).toHaveBeenCalled();
      const options = (mockSmartPrompt.showModal as jest.Mock).mock.calls[0][0];
      expect(options).toHaveLength(2);
      expect(options[0]).toContain('Infosys Ltd');
    });

    test('creates backend alert ticker via manager for selected pair', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockSmartPrompt.showModal.mockResolvedValue({
        type: 'reason',
        value: 'Infosys Ltd (SYMBOL: INFY, Exchange: NSE)',
      });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV_TICKER', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        type: 'SECONDARY',
        exchange: 'NSE',
      });
    });

    test('returns without mutation on cancel', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('returns without mutation on none', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'none', value: 'none' });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('warns on invalid selection', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockSmartPrompt.showModal.mockResolvedValue({
        type: 'reason',
        value: 'NonExistent (SYMBOL: XXX, Exchange: YYY)',
      });

      await handler.linkInvestingTicker('INFY');

      const { Notifier } = require('../../src/util/notify');
      expect(Notifier.warn).toHaveBeenCalledWith(
        'Invalid selection for INFY on , cant map Pair.'
      );
      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });
  });
});
