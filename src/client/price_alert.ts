import { BaseClient, IBaseClient } from './base';
import { KohanEnvelope } from '../models/journal';
import { Constants } from '../models/constant';
import {
  PendingPriceAlertRequest,
  PriceAlert,
  PriceAlertInput,
  PriceAlertListResponse,
  PriceAlertQueryParams,
  PriceAlertReplaceRequest,
  PriceAlertReplaceResult,
} from '../models/price_alert';

/**
 * PriceAlertClient handles price alert replacement, pending creation, deletion,
 * and listing against the Kohan backend. Covers Section 2.2.3 from the PRD.
 */
export interface IPriceAlertClient extends IBaseClient {
  /**
   * Replace backend price alerts for all pair IDs included in the request.
   * @param data - Complete refreshed alert rows for included pair IDs
   * @returns Promise resolving with replacement counts
   */
  replacePriceAlerts(data: PriceAlertReplaceRequest): Promise<PriceAlertReplaceResult>;

  /**
   * Create one pending price alert for a primary ticker.
   * @param ticker - Parent primary ticker identity
   * @param data - Pending alert trigger price payload
   * @returns Promise resolving with created pending price alert
   */
  createPendingPriceAlert(ticker: string, data: PendingPriceAlertRequest): Promise<PriceAlert>;

  /**
   * Delete one price alert by canonical alert ID.
   * @param alertId - Investing.com alert identifier
   */
  deletePriceAlert(alertId: string): Promise<void>;

  /**
   * List ALL price alerts matching filters, auto-paginating through all pages.
   * Backend enforces limit=10 max per page; this method handles the loop.
   * @param params - Query parameters (offset/limit are overridden)
   * @returns Promise resolving with all matching price alert records
   */
  listPriceAlerts(params: PriceAlertQueryParams): Promise<PriceAlert[]>;
}

/**
 * PriceAlertClient handles price alert APIs against the Kohan backend.
 */
export class PriceAlertClient extends BaseClient implements IPriceAlertClient {
  private static readonly pageLimit = 10;
  private static readonly replaceBatchLimit = 100;

  /**
   * Creates an instance of PriceAlertClient.
   * @param baseUrl - Base URL for Kohan API (defaults to Constants.KOHAN.BASE_URL)
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
  async replacePriceAlerts(data: PriceAlertReplaceRequest): Promise<PriceAlertReplaceResult> {
    let totalReplaced = 0;
    let totalCreated = 0;

    try {
      const batches = PriceAlertClient.buildReplaceBatches(data.alerts);
      for (const batch of batches) {
        const response = await this.makeRequest<KohanEnvelope<PriceAlertReplaceResult>>('/alerts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ alerts: batch }),
        });
        totalReplaced += response.data.pairs_replaced;
        totalCreated += response.data.alerts_created;
      }
      return { pairs_replaced: totalReplaced, alerts_created: totalCreated };
    } catch (error) {
      throw new Error(`Failed to replace price alerts: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async createPendingPriceAlert(ticker: string, data: PendingPriceAlertRequest): Promise<PriceAlert> {
    try {
      const response = await this.makeRequest<KohanEnvelope<PriceAlert>>(
        `/tickers/${encodeURIComponent(ticker)}/alerts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(data),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create pending price alert: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async deletePriceAlert(alertId: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/alerts/${encodeURIComponent(alertId)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw new Error(`Failed to delete price alert: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async listPriceAlerts(params: PriceAlertQueryParams): Promise<PriceAlert[]> {
    const limit = PriceAlertClient.pageLimit;
    let offset = 0;
    let total = 0;
    const all: PriceAlert[] = [];

    try {
      do {
        const query = this.buildPriceAlertQuery({ ...params, limit, offset });
        const response = await this.makeRequest<KohanEnvelope<PriceAlertListResponse>>(`/alerts?${query.toString()}`);
        const data = response.data;
        all.push(...data.alerts);
        total = data.metadata.total;
        offset += limit;
      } while (offset < total);

      return all;
    } catch (error) {
      throw new Error(`Failed to list all price alerts: ${(error as Error).message}`);
    }
  }

  /**
   * Group alerts by pair_id and pack into batches of at most `replaceBatchLimit`.
   * Alerts for the same pair_id are never split across requests.
   * @throws if a single pair_id exceeds `replaceBatchLimit`
   */
  private static buildReplaceBatches(alerts: PriceAlertInput[]): PriceAlertInput[][] {
    if (alerts.length === 0) {
      return [[]];
    }

    const byPairID = new Map<string, PriceAlertInput[]>();
    for (const alert of alerts) {
      const group = byPairID.get(alert.pair_id);
      if (group) {
        group.push(alert);
      } else {
        byPairID.set(alert.pair_id, [alert]);
      }
    }

    const pairIDs = Array.from(byPairID.keys()).sort();
    const batches: PriceAlertInput[][] = [];
    let current: PriceAlertInput[] = [];

    for (const pairID of pairIDs) {
      const group = byPairID.get(pairID)!;

      if (group.length > PriceAlertClient.replaceBatchLimit) {
        throw new Error(
          `Pair ${pairID} has ${group.length} alerts, which exceeds the maximum batch size of ${PriceAlertClient.replaceBatchLimit}`
        );
      }

      if (current.length > 0 && current.length + group.length > PriceAlertClient.replaceBatchLimit) {
        batches.push(current);
        current = [];
      }
      current.push(...group);
    }

    if (current.length > 0) {
      batches.push(current);
    }

    return batches;
  }

  /**
   * Append non-undefined values from a key/value list to a URLSearchParams instance.
   */
  private static setQueryParams(query: URLSearchParams, entries: Array<[string, string | number | undefined]>): void {
    for (const [key, value] of entries) {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    }
  }

  /**
   * Build URLSearchParams for Price alert query.
   */
  private buildPriceAlertQuery(params: PriceAlertQueryParams): URLSearchParams {
    const query = new URLSearchParams();
    PriceAlertClient.setQueryParams(query, [
      ['ticker', params.ticker],
      ['sort-by', params['sort-by']],
      ['sort-order', params['sort-order']],
      ['offset', params.offset],
      ['limit', params.limit],
    ]);
    return query;
  }
}
