import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IPairManager } from './pair';
import { ISymbolManager } from './symbol';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * TV Mapping Audit plugin: flags investing tickers that lack a TradingView mapping.
 * Emits FAIL results only (no PASS records) similar to AlertsAudit behavior.
 */
export class TvMappingPlugin extends BaseAuditPlugin {
  public readonly id = AUDIT_IDS.TV_MAPPING;
  public readonly title = 'TradingView Mapping';

  constructor(
    private readonly pairManager: IPairManager,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    const investingTickers = targets && targets.length > 0 ? targets : this.pairManager.getAllInvestingTickers();
    const results: AuditResult[] = [];

    investingTickers.forEach((investingTicker: string) => {
      // Check if investing ticker has a TV mapping
      const tvTicker = this.symbolManager.investingToTv(investingTicker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: investingTicker,
          message: `${investingTicker}: NO_TV_MAPPING`,
          severity: 'HIGH',
          status: 'FAIL',
        });
      }
    });

    return Promise.resolve(results);
  }
}
