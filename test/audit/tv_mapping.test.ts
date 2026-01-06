import { TvMappingAudit } from '../../src/audit/tv_mapping';
import { IPairManager } from '../../src/manager/pair';
import { ISymbolManager } from '../../src/manager/symbol';

// Unit tests for TvMappingAudit: flags missing TV mapping

describe('TvMappingAudit', () => {
  let plugin: TvMappingAudit;
  let pairManager: jest.Mocked<IPairManager>;
  let symbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    pairManager = {
      getAllInvestingTickers: jest.fn(),
    } as any;

    symbolManager = {
      investingToTv: jest.fn(),
    } as any;

    plugin = new TvMappingAudit(pairManager, symbolManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('run', () => {
    it('emits FAIL for tickers without TV mapping and none for mapped', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue(['AAPL', 'NSE:RELIANCE', 'MISSING']);

      symbolManager.investingToTv.mockImplementation((ticker: string) => {
        if (ticker === 'AAPL') return 'NASDAQ:AAPL';
        if (ticker === 'NSE:RELIANCE') return 'NSE:RELIANCE';
        return null;
      });

      const results = await plugin.run();
      const targets = results.map((r) => r.target);
      expect(targets).toEqual(['MISSING']);

      const only = results[0];
      expect(only.pluginId).toBe('tv-mapping');
      expect(only.code).toBe('NO_TV_MAPPING');
      expect(only.severity).toBe('HIGH');
      expect(only.status).toBe('FAIL');
    });

    it('handles empty list gracefully', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue([]);
      const results = await plugin.run();
      expect(results).toEqual([]);
    });
  });
});
