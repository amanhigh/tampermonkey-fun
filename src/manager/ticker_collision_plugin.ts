import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { ITickerRepo } from '../repo/ticker';
import { Constants } from '../models/constant';

/**
 * Ticker Collision Audit plugin: identifies reverse map collisions in TickerRepo.
 * Groups all TickerRepo entries by investingTicker value and identifies any
 * investingTicker that has more than one tvTicker key pointing to it.
 * Emits FAIL results only for collision groups.
 */
export class TickerCollisionPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.TICKER_COLLISION;
  public readonly title = 'Ticker Reverse Map Collisions';

  constructor(private readonly tickerRepo: ITickerRepo) {
    super();
  }

  /**
   * Runs ticker collision audit by grouping all TickerRepo entries by investingTicker.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for collision groups
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Ticker collision audit does not support targeted mode');
    }

    // Group tvTickers by investingTicker value
    const investingToTvTickers = new Map<string, string[]>();

    this.tickerRepo.getAllKeys().forEach((tvTicker: string) => {
      const investingTicker = this.tickerRepo.get(tvTicker);
      if (!investingTicker) {
        return;
      }

      if (!investingToTvTickers.has(investingTicker)) {
        investingToTvTickers.set(investingTicker, []);
      }
      investingToTvTickers.get(investingTicker)!.push(tvTicker);
    });

    // Emit findings for investingTickers with multiple tvTicker aliases
    const results: AuditResult[] = [];

    investingToTvTickers.forEach((tvTickers, investingTicker) => {
      if (tvTickers.length > 1) {
        results.push({
          pluginId: this.id,
          code: 'TICKER_COLLISION',
          target: investingTicker,
          message: `${investingTicker}: ${tvTickers.length} tvTicker aliases (${tvTickers.join(', ')})`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            investingTicker,
            tvTickers,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
