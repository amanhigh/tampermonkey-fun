import { PaginationMetadata } from '../models/api';
import { Constants } from '../models/constant';

/**
 * Constraint ensuring a page envelope carries pagination metadata
 * at `page.metadata`.
 */
export type PageConstraint = { metadata: PaginationMetadata };

/**
 * Lambda that fetches a single page of results.
 * @param offset - Zero-based starting index for this page
 * @param limit  - Maximum number of items per page
 * @returns Promise resolving to a page envelope carrying items and pagination metadata
 */
export type PageFetcher<TPage> = (offset: number, limit: number) => Promise<TPage>;

/**
 * Extracts the item array from a page envelope.
 * @param page - The page returned by the fetcher
 * @returns Array of items on this page
 */
export type ItemExtractor<TPage, TItem> = (page: TPage) => TItem[];

/**
 * Interface for the base manager providing reusable pagination helpers.
 */
export interface IBaseManager {
  /**
   * Fetches all pages of a paginated list endpoint and returns the aggregated items.
   *
   * @param fetchPage   - Lambda that fetches a single page given offset and limit
   * @param extractItems - Extracts the item array from each page
   * @param pageLimit   - Maximum items per page (defaults to Constants.KOHAN.PAGE_LIMIT)
   * @returns Aggregated items across all pages, preserving page order
   */
  listAllPages<TPage extends PageConstraint, TItem>(
    fetchPage: PageFetcher<TPage>,
    extractItems: ItemExtractor<TPage, TItem>,
    pageLimit?: number
  ): Promise<TItem[]>;
}

/**
 * Abstract base manager providing reusable pagination helpers.
 *
 * Subclasses inherit {@link listAllPages} without needing to re-implement
 * page-iteration logic. The helper is intentionally generic — it depends only
 * on callback lambdas and the shared {@link PaginationMetadata} model.
 */
export abstract class BaseManager implements IBaseManager {
  /** @inheritdoc */
  async listAllPages<TPage extends PageConstraint, TItem>(
    fetchPage: PageFetcher<TPage>,
    extractItems: ItemExtractor<TPage, TItem>,
    pageLimit: number = Constants.KOHAN.PAGE_LIMIT
  ): Promise<TItem[]> {
    const allItems: TItem[] = [];
    let offset = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await fetchPage(offset, pageLimit);
      const items = extractItems(page);
      const { total } = page.metadata;

      // Return early when total is zero — nothing to aggregate.
      if (total === 0) {
        return [];
      }

      allItems.push(...items);

      // Stop once we have collected all items.
      if (allItems.length >= total) {
        break;
      }

      offset += pageLimit;
    }

    return allItems;
  }
}
