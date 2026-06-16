import { Ticker } from '../../src/models/ticker';

describe('Ticker', () => {
  describe('qualifiedName', () => {
    it('should construct EXCHANGE:TICKER with known exchange', () => {
      const ticker = new Ticker({ ticker: 'RELIANCE', exchange: 'NSE' });
      expect(ticker.qualifiedName).toBe('NSE:RELIANCE');
    });

    it('should use AMEX exchange where applicable', () => {
      const ticker = new Ticker({ ticker: 'DBA', exchange: 'AMEX' });
      expect(ticker.qualifiedName).toBe('AMEX:DBA');
    });

    it('should return raw ticker when exchange is empty', () => {
      const ticker = new Ticker({ ticker: 'XAUUSD', exchange: '' });
      expect(ticker.qualifiedName).toBe('XAUUSD');
    });

    it('should preserve ticker for any exchange', () => {
      const ticker = new Ticker({ ticker: 'AAPL', exchange: 'NASDAQ' });
      expect(ticker.qualifiedName).toBe('NASDAQ:AAPL');
    });
  });
});
