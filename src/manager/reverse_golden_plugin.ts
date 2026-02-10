import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IPairRepo } from '../repo/pair';
import { ITickerRepo } from '../repo/ticker';
import { Constants } from '../models/constant';

/**
 * ReverseGolden Integrity Audit plugin (FR-007): ensures every investingTicker in PairRepo has a corresponding tvTicker in TickerRepo.
 * Checks if each pair in the pair repository has a corresponding TV ticker mapping.
 * Emits FAIL results only for pairs missing TV mappings.
 *
 * Metadata in data field:
 * - investingTicker: The Investing.com ticker without TV mapping
 *
 * TODO: Create ReverseGoldenSection to display results in Audit Framework
 * - Currently this plugin is registered but not called by any handler
 * - Was previously used by PanelHandler.VALIDATE_DATA (now removed)
 * - Future: Create section similar to OrphanAlertsSection
 * - Section should display unmapped pairs with click handlers to add mappings
 * - TODO: Decide button color (yellow for LOW severity or orange for MEDIUM?)
 */
export class ReverseGoldenPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.REVERSE_GOLDEN;
  public readonly title = 'ReverseGolden Integrity';

  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly tickerRepo: ITickerRepo
  ) {
    super();
  }

  /**
   * Runs reverse golden integrity audit by checking all pairs for TV ticker mapping.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for unmapped pairs
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Reverse golden integrity audit does not support targeted mode');
    }

    const results: AuditResult[] = [];
    const seenPairIds = new Set<string>();

    this.pairRepo.getAllKeys().forEach((investingTicker: string) => {
      const pairInfo = this.pairRepo.getPairInfo(investingTicker);
      if (!pairInfo) {
        return;
      }

      // Skip if we've already processed this pairId (deduplicate aliases)
      if (seenPairIds.has(pairInfo.pairId)) {
        return;
      }
      seenPairIds.add(pairInfo.pairId);

      const tvTicker = this.tickerRepo.getTvTicker(investingTicker);
      if (!tvTicker) {
        results.push({
          pluginId: this.id,
          code: 'NO_TV_MAPPING',
          target: investingTicker,
          message: `${investingTicker}: Pair exists but has no TradingView mapping`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            investingTicker,
            pairId: pairInfo.pairId,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
