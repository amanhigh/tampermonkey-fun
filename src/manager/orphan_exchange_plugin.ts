import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IExchangeRepo } from '../repo/exchange';
import { ITickerRepo } from '../repo/ticker';
import { Constants } from '../models/constant';

/**
 * Orphan Exchange Audit plugin: identifies exchange mappings without corresponding tickers.
 * Checks if each key in ExchangeRepo exists in TickerRepo tvTicker keys.
 * Emits FAIL results only for orphan exchange entries.
 */
export class OrphanExchangePlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ORPHAN_EXCHANGE;
  public readonly title = 'Exchange';

  constructor(
    private readonly exchangeRepo: IExchangeRepo,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs orphan exchange audit by checking all exchange keys against TickerRepo.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for orphan exchange mappings
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Orphan exchange audit does not support targeted mode');
    }

    const results: AuditResult[] = [];

    this.exchangeRepo.getAllKeys().forEach((tvTicker: string) => {
      if (!this.tickerRepo.has(tvTicker)) {
        const exchangeValue = this.exchangeRepo.get(tvTicker);
        results.push({
          pluginId: this.id,
          code: 'ORPHAN_EXCHANGE',
          target: tvTicker,
          message: `${tvTicker}: Exchange mapping (${exchangeValue}) exists but ticker not in TickerRepo`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            tvTicker,
            exchangeValue,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
