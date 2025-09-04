import { SymbolManager, ISymbolManager } from '../../src/manager/symbol';
import { ITickerRepo } from '../../src/repo/ticker';
import { IExchangeRepo } from '../../src/repo/exchange';

describe('SymbolManager', () => {
  let symbolManager: ISymbolManager;
  let tickerRepoMock: jest.Mocked<ITickerRepo>;
  let exchangeRepoMock: jest.Mocked<IExchangeRepo>;

  beforeEach(() => {
    tickerRepoMock = {
      getInvestingTicker: jest.fn(),
      getTvTicker: jest.fn(),
      pinInvestingTicker: jest.fn(),
      delete: jest.fn(),
    } as any;

    exchangeRepoMock = {
      getExchangeTicker: jest.fn(),
      pinExchange: jest.fn(),
    } as any;

    symbolManager = new SymbolManager(tickerRepoMock, exchangeRepoMock);
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
    it('should return exchange ticker from repo', () => {
      exchangeRepoMock.getExchangeTicker.mockReturnValue('EXCHANGE_TICKER');
      expect(symbolManager.tvToExchangeTicker('TV_TICKER')).toBe('EXCHANGE_TICKER');
      expect(exchangeRepoMock.getExchangeTicker).toHaveBeenCalledWith('TV_TICKER');
    });
  });

  describe('createTvToInvestingMapping', () => {
    it('should pin investing ticker in repo', () => {
      symbolManager.createTvToInvestingMapping('TV_TICKER', 'INVESTING_TICKER');
      expect(tickerRepoMock.pinInvestingTicker).toHaveBeenCalledWith('TV_TICKER', 'INVESTING_TICKER');
    });
  });

  describe('removeTvToInvestingMapping', () => {
    it('should delete mapping if tv ticker found', () => {
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

  describe('createTvToExchangeTickerMapping', () => {
    it('should pin exchange in repo', () => {
      symbolManager.createTvToExchangeTickerMapping('TV_TICKER', 'NSE');
      expect(exchangeRepoMock.pinExchange).toHaveBeenCalledWith('TV_TICKER', 'NSE');
    });
  });

  describe('isComposite', () => {
    it('should return true for symbols with composite characters', () => {
      expect(symbolManager.isComposite('A/B')).toBe(true);
      expect(symbolManager.isComposite('A*B')).toBe(true);
    });

    it('should return false for symbols without composite characters', () => {
      expect(symbolManager.isComposite('ABC')).toBe(false);
      expect(symbolManager.isComposite('A_B')).toBe(false);
    });
  });
});
