import { Alert, PairInfo } from './alert';

export class ValidationExclusions {
  private readonly excludedPairIds: Set<string> = new Set();
  private readonly excludedTickers: Set<string> = new Set();

  public addExcludedPairId(pairId: string): void {
    this.excludedPairIds.add(pairId);
  }

  public addExcludedTicker(ticker: string): void {
    this.excludedTickers.add(ticker);
  }

  public isExcludedPair(pairId: string): boolean {
    return this.excludedPairIds.has(pairId);
  }

  public isExcludedTicker(ticker: string): boolean {
    return this.excludedTickers.has(ticker);
  }
}

export class ValidationResults {
  private readonly orphanAlerts: Alert[] = [];
  private readonly unmappedPairs: PairInfo[] = [];

  public addOrphanAlert(alert: Alert): void {
    this.orphanAlerts.push(alert);
  }

  public addUnmappedPair(pair: PairInfo): void {
    this.unmappedPairs.push(pair);
  }

  public getOrphanAlertCount(): number {
    return this.orphanAlerts.length;
  }

  public getUnmappedPairCount(): number {
    return this.unmappedPairs.length;
  }

  public getOrphanAlerts(): Alert[] {
    return this.orphanAlerts;
  }

  public getUnmappedPairs(): PairInfo[] {
    return this.unmappedPairs;
  }

  public getFormattedSummary(): string {
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
          ⚠️ Orphan Alerts: <span style="${styles.count}">${this.getOrphanAlertCount()}</span>
        </div>
        <div style="${styles.item}">
          🔗 Unmapped Pairs: <span style="${styles.count}">${this.getUnmappedPairCount()}</span>
        </div>
        <div style="${styles.item}">
          ${this.getStatusEmoji()} Status: ${this.getStatusMessage()}
        </div>
      </div>
    `;
  }

  public logDetailedResults(): void {
    console.info('=== Validation Details ===');

    console.info('Orphan Alerts:', this.orphanAlerts.length);
    this.orphanAlerts.forEach((alert) =>
      console.info(`- Alert ${alert.id}: PairID ${alert.pairId} Price ${alert.price}`)
    );

    console.info('Unmapped Pairs:', this.unmappedPairs.length);
    this.unmappedPairs.forEach((pair) =>
      console.info(`- Pair ${pair.name}: ID ${pair.pairId} Exchange ${pair.exchange}`)
    );
  }

  private getStatusEmoji(): string {
    const totalIssues = this.getOrphanAlertCount() + this.getUnmappedPairCount();
    return totalIssues === 0 ? '✅' : '❌';
  }

  private getStatusMessage(): string {
    const totalIssues = this.getOrphanAlertCount() + this.getUnmappedPairCount();
    return totalIssues === 0 ? 'All validations passed' : 'Issues found (check console for details)';
  }
}
