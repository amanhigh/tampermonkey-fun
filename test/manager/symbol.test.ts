import { SymbolManager, ISymbolManager } from '../../src/manager/symbol';
import { ITickerRepo } from '../../src/repo/ticker';
import { ITickerClient } from '../../src/client/ticker';
import { TickerRecord } from '../../src/models/ticker';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
  },
}));

describe('SymbolManager', () => {
  let symbolManager: ISymbolManager;
  let tickerRepoMock: jest.Mocked<ITickerRepo>;
  let tickerClientMock: jest.Mocked<ITickerClient>;

  const createMockRecord = (overrides: Partial<TickerRecord> = {}): TickerRecord => ({
    ticker: 'TV_TICKER',
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
    tickerRepoMock = {
      getInvestingTicker: jest.fn(),
      getTvTicker: jest.fn(),
      pinInvestingTicker: jest.fn(),
      delete: jest.fn(),
    } as any;

    tickerClientMock = {
      getTicker: jest.fn(),
      updateTicker: jest.fn().mockResolvedValue(undefined),
      listAllTickers: jest.fn(),
      createTicker: jest.fn(),
      patchTickerLastOpened: jest.fn(),
      deleteTicker: jest.fn(),
      getBaseUrl: jest.fn(),
    } as unknown as jest.Mocked<ITickerClient>;

    symbolManager = new SymbolManager(tickerRepoMock, tickerClientMock);
  });

  describe('kiteToTv', () => {
    it('should map known kite symbol to tv symbol', () => {
      expect(symbolManager.kiteToTv('M_M')).toBe('M&M');
      expect(symbolManager.kiteToTv('M_MFIN')).toBe('M&MFIN');
    });

    it('should return original symbol if no mapping exists', () => {
      expect(symbolManager.kiteToTv('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('tvToKite', () => {
    it('should map known tv symbol to kite symbol', () => {
      expect(symbolManager.tvToKite('M&M')).toBe('M_M');
      expect(symbolManager.tvToKite('M&MFIN')).toBe('M_MFIN');
    });

    it('should return original symbol if no mapping exists', () => {
      expect(symbolManager.tvToKite('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('tvToInvesting', () => {
    it('should return investing ticker from repo', () => {
      tickerRepoMock.getInvestingTicker.mockReturnValue('INVESTING_TICKER');
      expect(symbolManager.tvToInvesting('TV_TICKER')).toBe('INVESTING_TICKER');
      expect(tickerRepoMock.getInvestingTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    it('should return null if no mapping', () => {
      tickerRepoMock.getInvestingTicker.mockReturnValue(null);
      expect(symbolManager.tvToInvesting('TV_TICKER')).toBeNull();
    });
  });

  describe('investingToTv', () => {
    it('should return tv ticker from repo', () => {
      tickerRepoMock.getTvTicker.mockReturnValue('TV_TICKER');
      expect(symbolManager.investingToTv('INVESTING_TICKER')).toBe('TV_TICKER');
      expect(tickerRepoMock.getTvTicker).toHaveBeenCalledWith('INVESTING_TICKER');
    });

    it('should return null if no mapping', () => {
      tickerRepoMock.getTvTicker.mockReturnValue(null);
      expect(symbolManager.investingToTv('INVESTING_TICKER')).toBeNull();
    });
  });

  describe('tvToExchangeTicker', () => {
    it('should return "EXCHANGE:ticker" when backend has exchange', async () => {
      tickerClientMock.getTicker.mockResolvedValue(createMockRecord({ exchange: 'NSE' }));

      const result = await symbolManager.tvToExchangeTicker('TV_TICKER');

      expect(result).toBe('NSE:TV_TICKER');
      expect(tickerClientMock.getTicker).toHaveBeenCalledWith('TV_TICKER');
    });

    it('should return raw ticker when backend exchange is null', async () => {
      tickerClientMock.getTicker.mockResolvedValue(createMockRecord({ exchange: null }));

      const result = await symbolManager.tvToExchangeTicker('TV_TICKER');

      expect(result).toBe('TV_TICKER');
    });

    it('should return raw ticker when backend read fails', async () => {
      tickerClientMock.getTicker.mockRejectedValue(new Error('Not found'));

      const result = await symbolManager.tvToExchangeTicker('TV_TICKER');

      expect(result).toBe('TV_TICKER');
    });
  });

  describe('createTvToInvestingMapping', () => {
    it('should pin investing ticker in repo', () => {
      symbolManager.createTvToInvestingMapping('TV_TICKER', 'INVESTING_TICKER');
      expect(tickerRepoMock.pinInvestingTicker).toHaveBeenCalledWith('TV_TICKER', 'INVESTING_TICKER');
    });
  });

  describe('removeTvToInvestingMapping', () => {
    it('should delete TV ticker for investing ticker', () => {
      tickerRepoMock.getTvTicker.mockReturnValue('TV_TICKER');
      symbolManager.removeTvToInvestingMapping('INVESTING_TICKER');
      expect(tickerRepoMock.getTvTicker).toHaveBeenCalledWith('INVESTING_TICKER');
      expect(tickerRepoMock.delete).toHaveBeenCalledWith('TV_TICKER');
    });

    it('should not delete if no tv ticker found', () => {
      tickerRepoMock.getTvTicker.mockReturnValue(null);
      symbolManager.removeTvToInvestingMapping('INVESTING_TICKER');
      expect(tickerRepoMock.delete).not.toHaveBeenCalled();
    });
  });

  describe('setExchange', () => {
    it('should update backend ticker exchange to a value', async () => {
      await symbolManager.setExchange('TV_TICKER', 'NSE');

      // updateTicker receives only the changed field; merge happens internally
      expect(tickerClientMock.updateTicker).toHaveBeenCalledWith('TV_TICKER', {
        exchange: 'NSE',
      });
    });

    it('should clear backend ticker exchange to null', async () => {
      await symbolManager.setExchange('TV_TICKER', null);

      expect(tickerClientMock.updateTicker).toHaveBeenCalledWith('TV_TICKER', {
        exchange: null,
      });
    });

    it('should silently handle backend update failure', async () => {
      tickerClientMock.updateTicker.mockRejectedValue(new Error('Backend error'));

      await expect(symbolManager.setExchange('UNKNOWN', 'NSE')).resolves.toBeUndefined();
    });
  });

  describe('isComposite', () => {
    it('should return true for symbols with composite characters', () => {
      expect(symbolManager.isComposite('A/B')).toBe(true);
      expect(symbolManager.isComposite('A*B')).toBe(true);
      expect(symbolManager.isComposite('A-B')).toBe(true);
      expect(symbolManager.isComposite('A:B')).toBe(true);
      expect(symbolManager.isComposite('GOLDSILVER')).toBe(true);
      expect(symbolManager.isComposite('BTC.D')).toBe(true);
    });

    it('should return false for symbols without composite characters', () => {
      expect(symbolManager.isComposite('ABC')).toBe(false);
      expect(symbolManager.isComposite('A_B')).toBe(false);
    });
  });
});
