import { ISmartPrompt } from '../util/smart';
import { IPairHandler } from './pair';
import { ITickerManager } from '../manager/ticker';
import { Notifier } from '../util/notify';
import { Color } from '../models/color';
import type { AuditRegistry } from '../audit/registry';
import { AuditResult } from '../models/audit';
import { AUDIT_IDS } from '../models/audit_ids';

export interface IPanelHandler {
  showPanel(): Promise<void>;
}

enum PanelAction {
  DELETE_PAIR = 'Delete Pair Info',
  VALIDATE_DATA = 'Validate Data Integrity',
}

export class PanelHandler implements IPanelHandler {
  constructor(
    private readonly smartPrompt: ISmartPrompt,
    private readonly pairHandler: IPairHandler,
    private readonly tickerManager: ITickerManager,
    private readonly auditRegistry: AuditRegistry
  ) {}

  public async showPanel(): Promise<void> {
    const actions = Object.values(PanelAction);
    const selected = await this.smartPrompt.showModal(actions);
    if (selected && selected !== 'Cancel') {
      await this.handlePanelAction(selected as PanelAction);
    }
  }

  private async handlePanelAction(action: PanelAction): Promise<void> {
    let searchTicker = '';
    try {
      searchTicker = this.tickerManager.getInvestingTicker();
    } catch (error) {
      searchTicker = this.tickerManager.getTicker();
      console.warn('Using TV Ticker Instead', error);
    }

    switch (action) {
      case PanelAction.DELETE_PAIR:
        await this.pairHandler.deletePairInfo(searchTicker);
        break;
      case PanelAction.VALIDATE_DATA:
        await this.handleValidation();
        break;
    }
  }

  /**
   * Handles the validation action - runs audits and displays results
   * @private
   */
  private async handleValidation(): Promise<void> {
    try {
      const results = await this.executeValidationAudits();
      this.displayValidationResults(results);
    } catch (error) {
      console.error('Validation failed:', error);
      Notifier.message('Data validation failed. Check console for details.', Color.ROYAL_BLUE, 5000);
    }
  }

  /**
   * Executes all validation audit plugins
   * @private
   * @returns Combined array of audit results
   */
  private async executeValidationAudits(): Promise<AuditResult[]> {
    const orphanPlugin = this.auditRegistry.mustGet(AUDIT_IDS.ORPHAN_ALERTS);
    const unmappedPlugin = this.auditRegistry.mustGet(AUDIT_IDS.UNMAPPED_PAIRS);

    const orphanResults = await orphanPlugin.run();
    const unmappedResults = await unmappedPlugin.run();

    return [...orphanResults, ...unmappedResults];
  }

  /**
   * Displays validation results to user (notification + console)
   * @private
   * @param results Array of audit results
   */
  private displayValidationResults(results: AuditResult[]): void {
    const summary = this.formatValidationSummary(results);
    Notifier.message(summary, Color.ROYAL_BLUE, 10000);
    this.logValidationDetails(results);
  }

  /**
   * Formats validation results into an HTML summary with styling
   * @private
   * @param results Array of audit results
   * @returns Formatted HTML string
   */
  private formatValidationSummary(results: AuditResult[]): string {
    const counts = this.countValidationResults(results);
    const statusEmoji = this.getStatusEmoji(counts);
    const statusMessage = this.getStatusMessage(counts);

    const styles = {
      container: 'font-family: monospace; line-height: 1.5;',
      header: 'color: #FFA500; font-weight: bold; margin: 8px 0;',
      item: 'margin-left: 12px; color: #FFFFFF;',
      count: 'color: #00FF00; font-weight: bold;',
    };

    return `
      <div style="${styles.container}">
        <div style="${styles.header}">🔍 Data Validation Report</div>
        <div style="${styles.item}">
          ⚠️ Orphan Alerts: <span style="${styles.count}">${counts.orphanCount}</span>
        </div>
        <div style="${styles.item}">
          🔗 Unmapped Pairs: <span style="${styles.count}">${counts.unmappedCount}</span>
        </div>
        <div style="${styles.item}">
          ${statusEmoji} Status: ${statusMessage}
        </div>
      </div>
    `;
  }

  /**
   * Logs detailed validation results to console
   * @private
   * @param results Array of audit results
   */
  private logValidationDetails(results: AuditResult[]): void {
    console.info('=== Validation Details ===');

    const orphanAlerts = this.filterResultsByCode(results, 'NO_PAIR_MAPPING');
    console.info('Orphan Alerts:', orphanAlerts.length);
    orphanAlerts.forEach((r) => console.info(`- ${r.target}: ${r.message}`));

    const unmappedPairs = this.filterResultsByCode(results, 'NO_TV_MAPPING');
    console.info('Unmapped Pairs:', unmappedPairs.length);
    unmappedPairs.forEach((r) => console.info(`- ${r.target}: ${r.message}`));
  }

  /**
   * Counts validation results by type
   * @private
   * @param results Array of audit results
   * @returns Object with orphanCount and unmappedCount
   */
  private countValidationResults(results: AuditResult[]): { orphanCount: number; unmappedCount: number } {
    return {
      orphanCount: this.filterResultsByCode(results, 'NO_PAIR_MAPPING').length,
      unmappedCount: this.filterResultsByCode(results, 'NO_TV_MAPPING').length,
    };
  }

  /**
   * Filters audit results by code
   * @private
   * @param results Array of audit results
   * @param code The code to filter by
   * @returns Filtered audit results
   */
  private filterResultsByCode(results: AuditResult[], code: string): AuditResult[] {
    return results.filter((r) => r.code === code);
  }

  /**
   * Gets status emoji based on issue count
   * @private
   * @param counts Object with orphanCount and unmappedCount
   * @returns Status emoji (✅ or ❌)
   */
  private getStatusEmoji(counts: { orphanCount: number; unmappedCount: number }): string {
    const totalIssues = counts.orphanCount + counts.unmappedCount;
    return totalIssues === 0 ? '✅' : '❌';
  }

  /**
   * Gets status message based on issue count
   * @private
   * @param counts Object with orphanCount and unmappedCount
   * @returns Status message
   */
  private getStatusMessage(counts: { orphanCount: number; unmappedCount: number }): string {
    const totalIssues = counts.orphanCount + counts.unmappedCount;
    return totalIssues === 0 ? 'All validations passed' : 'Issues found (check console for details)';
  }
}
