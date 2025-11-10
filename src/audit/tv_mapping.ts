import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IPairManager } from '../manager/pair';
import { ISymbolManager } from '../manager/symbol';

/**
 * TV Mapping Audit plugin: flags investing tickers that lack a TradingView mapping.
 * Emits FAIL results only (no PASS records) similar to AlertsAudit behavior.
 */
export class TvMappingAudit extends BaseAuditPlugin {
  public readonly id = 'tv-mapping';
  public readonly title = 'TradingView Mapping';

  constructor(
    private readonly pairManager: IPairManager,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
  }

  run(): AuditResult[] {
    const investingTickers = this.pairManager.getAllInvestingTickers();
    const results: AuditResult[] = [];

    investingTickers.forEach((ticker: string) => {
      const tvTicker = this.symbolManager.investingToTv(ticker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: ticker,
          message: `${ticker}: NO_TV_MAPPING`,
          severity: 'HIGH',
          status: 'FAIL',
        });
      }
    });

    return results;
  }
}
