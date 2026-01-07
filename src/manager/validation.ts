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

    // Run orphan alerts validation via plugin
    await this.validateAlertsToPairsViaPlugin(results);

    // Run unmapped pairs validation via plugin
    await this.validatePairsToTickersViaPlugin(results);

    return results;
  }

  /**
   * Validates that all alerts have corresponding pairs via plugin
   * Replaces legacy validateAlertsToPairs() logic
   * @private
   */
  private async validateAlertsToPairsViaPlugin(results: ValidationResults): Promise<void> {
    try {
      const orphanAlertsPlugin = this.auditRegistry.get('orphan-alerts');
      if (!orphanAlertsPlugin) {
        console.warn('OrphanAlertsAudit plugin not found in registry');
        return;
      }

      // Run the plugin to get orphan alerts
      const auditResults = await orphanAlertsPlugin.run();

      // Convert audit results to orphan alerts in ValidationResults
      auditResults.forEach((auditResult) => {
        const alerts = this.alertRepo.get(auditResult.target);
        if (alerts) {
          alerts.forEach((alert) => results.addOrphanAlert(alert));
        }
      });
    } catch (error) {
      console.error('Error running OrphanAlertsAudit plugin:', error);
    }
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
