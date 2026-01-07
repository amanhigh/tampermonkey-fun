import { ValidationResults } from '../models/validation';
import { IAlertRepo } from '../repo/alert';
import { IPairRepo } from '../repo/pair';
import type { AuditRegistry } from '../audit/registry';

export interface IValidationManager {
  validate(): Promise<ValidationResults>;
}

export class ValidationManager implements IValidationManager {
  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly pairRepo: IPairRepo,
    private readonly auditRegistry: AuditRegistry
  ) {}

  /**
   * Validates data integrity by running audit plugins for all concerns
   * Combines results from multiple validation audits into a single report
   * @returns Promise resolving to ValidationResults with all validation issues
   */
  public async validate(): Promise<ValidationResults> {
    const results = new ValidationResults();

    // Run orphan alerts validation
    this.validateAlertsToPairs(results);

    // Run unmapped pairs validation via plugin (replaces legacy logic)
    await this.validatePairsToTickersViaPlugin(results);

    return results;
  }

  /**
   * Validates that all alerts have corresponding pairs
   * @private
   */
  private validateAlertsToPairs(results: ValidationResults): void {
    // Get all alert keys and create set of pair IDs
    const alertKeys = this.alertRepo.getAllKeys();
    const pairIds = new Set<string>();

    // Build set of pair IDs from all pairs
    this.pairRepo.getAllKeys().forEach((ticker) => {
      const pairInfo = this.pairRepo.get(ticker);
      if (pairInfo) {
        pairIds.add(pairInfo.pairId);
      }
    });

    // For each alert key
    alertKeys.forEach((pairId: string) => {
      const alerts = this.alertRepo.get(pairId) ?? [];

      // If no pair exists for this alert's pairId
      if (!pairIds.has(pairId)) {
        alerts.forEach((alert) => results.addOrphanAlert(alert));
      }
    });
  }

  /**
   * Validates that all pairs have TradingView ticker mappings via plugin
   * Replaces legacy validatePairsToTickers() logic
   * @private
   */
  private async validatePairsToTickersViaPlugin(results: ValidationResults): Promise<void> {
    try {
      const unmappedPairsPlugin = this.auditRegistry.get('unmapped-pairs');
      if (!unmappedPairsPlugin) {
        console.warn('UnmappedPairsAudit plugin not found in registry');
        return;
      }

      // Run the plugin to get unmapped pairs
      const auditResults = await unmappedPairsPlugin.run();

      // Convert audit results to unmapped pairs in ValidationResults
      auditResults.forEach((auditResult) => {
        const pairInfo = this.pairRepo.get(auditResult.target);
        if (pairInfo) {
          results.addUnmappedPair(pairInfo);
        }
      });
    } catch (error) {
      console.error('Error running UnmappedPairsAudit plugin:', error);
    }
  }
}
