import { Ticker } from '../../src/models/ticker';

describe('Ticker', () => {
  describe('getExchange', () => {
    it('should return raw exchange when no mapping exists', () => {
      const ticker = new Ticker({ ticker: 'RELIANCE', exchange: 'NSE' });
      expect(ticker.getExchange()).toBe('NSE');
    });

    it('should map NYSE_ARCA to AMEX for TradingView search', () => {
      const ticker = new Ticker({ ticker: 'DBA', exchange: 'NYSE_ARCA' });
      expect(ticker.getExchange()).toBe('AMEX');
    });

    it('should return empty string when exchange is empty', () => {
      const ticker = new Ticker({ ticker: 'BTCUSD', exchange: '' });
      expect(ticker.getExchange()).toBe('');
    });
  });

  describe('qualifiedName', () => {
    it('should use denormalized exchange via getExchange', () => {
      const ticker = new Ticker({ ticker: 'DBA', exchange: 'NYSE_ARCA' });
      expect(ticker.qualifiedName).toBe('AMEX:DBA');
    });

    it('should construct with raw exchange when no mapping exists', () => {
      const ticker = new Ticker({ ticker: 'RELIANCE', exchange: 'NSE' });
      expect(ticker.qualifiedName).toBe('NSE:RELIANCE');
    });

    it('should return raw ticker when exchange is empty', () => {
      const ticker = new Ticker({ ticker: 'XAUUSD', exchange: '' });
      expect(ticker.qualifiedName).toBe('XAUUSD');
    });

    it('should preserve ticker when exchange has no mapping', () => {
      const ticker = new Ticker({ ticker: 'AAPL', exchange: 'NASDAQ' });
      expect(ticker.qualifiedName).toBe('NASDAQ:AAPL');
    });
  });
});
