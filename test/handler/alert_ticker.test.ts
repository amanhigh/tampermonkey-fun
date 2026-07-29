import { AlertTickerHandler } from '../../src/handler/alert_ticker';
import { IInvestingManager } from '../../src/manager/investing';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { ISmartPrompt, SmartPromptResponseType } from '../../src/util/smart';
import { IDomManager } from '../../src/manager/dom';
import { Instrument } from '../../src/models/investing';

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
  let mockInvestingManager: jest.Mocked<IInvestingManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockSmartPrompt: jest.Mocked<ISmartPrompt>;
  let mockDomManager: jest.Mocked<IDomManager>;

  const mockInstruments: Instrument[] = [
    { id: 1001, description: 'Infosys Ltd', symbol: 'INFY', exchange: 'NSE', url: '/equities/infosys-ltd' },
    { id: 1002, description: 'Infosys - CDR', symbol: 'INFY.PA', exchange: 'XPAR', url: '/equities/infosys-cdr' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockInvestingManager = {
      searchInstruments: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      linkAlertTicker: jest.fn().mockResolvedValue({} as any),
      fetchAlertTicker: jest.fn(),
    } as any;

    mockSmartPrompt = {
      showModal: jest.fn(),
    } as any;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TV_TICKER'),
    } as any;

    handler = new AlertTickerHandler(
      mockInvestingManager,
      mockAlertTickerManager,
      mockSmartPrompt,
      mockDomManager
    );
  });

  describe('linkInvestingTicker', () => {
    test('searches Investing symbols and shows top 10 options', async () => {
      mockInvestingManager.searchInstruments.mockResolvedValue(mockInstruments);
      mockSmartPrompt.showModal.mockResolvedValue({ type: SmartPromptResponseType.CANCEL, value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockInvestingManager.searchInstruments).toHaveBeenCalledWith('INFY');
      expect(mockSmartPrompt.showModal).toHaveBeenCalled();
      const options = (mockSmartPrompt.showModal as jest.Mock).mock.calls[0][0];
      expect(options).toHaveLength(2);
      expect(options[0]).toContain('Infosys Ltd');
    });

    test('passes selected instrument to linkAlertTicker without type', async () => {
      mockInvestingManager.searchInstruments.mockResolvedValue(mockInstruments);
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'Infosys Ltd (SYMBOL: INFY, Exchange: NSE)',
        answers: {},
      });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).toHaveBeenCalledWith('TV_TICKER', {
        symbol: 'INFY',
        pair_id: '1001',
        name: 'Infosys Ltd',
        exchange: 'NSE',
      });
    });

    test('returns without mutation on cancel', async () => {
      mockInvestingManager.searchInstruments.mockResolvedValue(mockInstruments);
      mockSmartPrompt.showModal.mockResolvedValue({ type: SmartPromptResponseType.CANCEL, value: null });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('returns without mutation on none', async () => {
      mockInvestingManager.searchInstruments.mockResolvedValue(mockInstruments);
      mockSmartPrompt.showModal.mockResolvedValue({ type: SmartPromptResponseType.NONE, value: 'none', answers: {} });

      await handler.linkInvestingTicker('INFY');

      expect(mockAlertTickerManager.linkAlertTicker).not.toHaveBeenCalled();
    });

    test('warns on invalid selection', async () => {
      mockInvestingManager.searchInstruments.mockResolvedValue(mockInstruments);
      mockSmartPrompt.showModal.mockResolvedValue({
        type: SmartPromptResponseType.SELECTED,
        primarySelection: 'NonExistent (SYMBOL: XXX, Exchange: YYY)',
        answers: {},
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
