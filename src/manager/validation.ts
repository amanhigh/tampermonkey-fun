import { ValidationResults } from '../models/validation';
import { IAlertRepo } from '../repo/alert';
import { IPairRepo } from '../repo/pair';
import { ITickerRepo } from '../repo/ticker';

export interface IValidationManager {
  validate(): ValidationResults;
}

export class ValidationManager implements IValidationManager {
  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly pairRepo: IPairRepo,
    private readonly tickerRepo: ITickerRepo
  ) {}

  public validate(): ValidationResults {
    const results = new ValidationResults();
    this.validateAlertsToPairs(results);
    this.validatePairsToTickers(results);
    return results;
  }

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

  private validatePairsToTickers(results: ValidationResults): void {
    // Get all pair keys
    const pairKeys = this.pairRepo.getAllKeys();

    // For each pair key
    pairKeys.forEach((ticker: string) => {
      const pairInfo = this.pairRepo.get(ticker);

      // If pair exists but has no ticker mapping
      if (pairInfo && !this.tickerRepo.getTvTicker(ticker)) {
        results.addUnmappedPair(pairInfo);
      }
    });
  }
}
