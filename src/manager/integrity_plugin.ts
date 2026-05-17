import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IAlertTickerClient } from '../client/alert_ticker';
import { ITickerRepo } from '../repo/ticker';
import { Constants } from '../models/constant';

/**
 * Integrity Audit plugin (FR-007): ensures every alert ticker on the backend
 * has a corresponding tvTicker in TickerRepo.
 * Surfaces unmapped pairs that block alert creation and chart navigation.
 * Emits FAIL results only (no PASS records).
 */
export class IntegrityPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.INTEGRITY;
  public readonly title = 'Integrity';

  constructor(
    private readonly alertTickerClient: IAlertTickerClient,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs integrity audit by checking all alert tickers for TV ticker mapping.
   * Audits entire repository — targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for unmapped pairs
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Integrity audit does not support targeted mode');
    }

    const results: AuditResult[] = [];
    const seenPairIds = new Set<string>();

    const alertTickers = await this.alertTickerClient.listAlertTickers({});

    alertTickers.forEach((record) => {
      const investingTicker = record.symbol;
      const pairId = record.pair_id;

      // Skip if we've already processed this pairId (deduplicate aliases)
      if (seenPairIds.has(pairId)) {
        return;
      }
      seenPairIds.add(pairId);

      const tvTicker = this.tickerRepo.getTvTicker(investingTicker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: investingTicker,
          message: `${investingTicker}: Pair exists but has no TradingView mapping`,
          severity: 'HIGH',
          status: 'FAIL',
          data: {
            investingTicker,
            pairId,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
