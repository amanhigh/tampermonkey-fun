import { AlertTickerHandler } from '../../src/handler/alert_ticker';
import { IInvestingClient } from '../../src/client/investing';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ISmartPrompt } from '../../src/util/smart';
import { IDomManager } from '../../src/manager/dom';
import { PairInfo } from '../../src/models/alert';
import { AlertTicker } from '../../src/models/alert_ticker';

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

  const makePrimaryTicker = (): AlertTicker => ({
    symbol: 'INFY',
    pair_id: 'pair1',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    type: 'PRIMARY',
    ticker: 'TV_TICKER',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvestingClient = {
      fetchSymbolData: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      linkAlertTicker: jest.fn().mockResolvedValue({} as any),
      getPrimaryAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      fetchAlertTicker: jest.fn(),
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
    test('searches Investing symbols and shows top 10 options with title', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockInvestingClient.fetchSymbolData).toHaveBeenCalledWith('INFY');
      expect(mockAlertTickerManager.getPrimaryAlertTicker).toHaveBeenCalledWith('TV_TICKER');
      expect(mockSmartPrompt.showModal).toHaveBeenCalled();
      const options = (mockSmartPrompt.showModal as jest.Mock).mock.calls[0][0];
      const title = (mockSmartPrompt.showModal as jest.Mock).mock.calls[0][2];
      expect(options).toHaveLength(2);
      expect(options[0]).toContain('Infosys Ltd');
      expect(title).toContain('PRIMARY: none');
    });

    test('creates PRIMARY alert ticker when no primary exists', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);
      mockSmartPrompt.showModal.mockResolvedValue({
        type: 'reason',
        value: 'Infosys Ltd (SYMBOL: INFY, Exchange: NSE)',
      });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV_TICKER', {
        symbol: 'INFY',
        pair_id: 'pair1',
        name: 'Infosys Ltd',
        type: 'PRIMARY',
        exchange: 'NSE',
      });
    });

    test('creates SECONDARY alert ticker when primary already exists', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(makePrimaryTicker());
      mockSmartPrompt.showModal.mockResolvedValue({
        type: 'reason',
        value: 'Infosys - CDR (SYMBOL: INFY.PA, Exchange: XPAR)',
      });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV_TICKER', {
        symbol: 'INFY.PA',
        pair_id: 'pair2',
        name: 'Infosys - CDR',
        type: 'SECONDARY',
        exchange: 'XPAR',
      });
    });

    test('shows existing primary in prompt title', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(makePrimaryTicker());
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await handler.linkInvestingTicker('INFY');

      const title = (mockSmartPrompt.showModal as jest.Mock).mock.calls[0][2];
      expect(title).toContain('PRIMARY: INFY');
      expect(title).toContain('SECONDARY');
    });

    test('returns without mutation on cancel', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'cancel', value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('returns without mutation on none', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);
      mockSmartPrompt.showModal.mockResolvedValue({ type: 'none', value: 'none' });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('warns on invalid selection', async () => {
      mockInvestingClient.fetchSymbolData.mockResolvedValue(mockPairs);
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);
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
