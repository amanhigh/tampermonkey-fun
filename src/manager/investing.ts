import { IInstrumentClient } from '../client/instrument';
import { Instrument } from '../models/investing';

/**
 * Interface for managing Investing.com instrument resolution.
 *
 * Domain methods:
 * - getInstrument → search public API, match by href or exact name, return best candidate or null
 */
export interface IInvestingManager {
  /**
   * Resolve an Investing.com instrument by name and optional href.
   *
   * Matching:
   * 1. When href is provided, extract path and match instrument.url exactly.
   * 2. Otherwise match name against instrument.description exactly (case-insensitive).
   * 3. Returns null when no match.
   *
   * @param name - Search term (instrument display name)
   * @param href - Optional full Investing.com URL to match against instrument.url
   * @returns Promise resolving with matched Instrument, or null
   */
  getInstrument(name: string, href?: string): Promise<Instrument | null>;
}

/**
 * Manages Investing.com instrument resolution using the public search API.
 */
export class InvestingManager implements IInvestingManager {
  constructor(private readonly instrumentClient: IInstrumentClient) {}

  /** @inheritdoc */
  async getInstrument(name: string, href?: string): Promise<Instrument | null> {
    const response = await this.instrumentClient.getInstruments(name);
    const quotes = response.quotes;
    if (!quotes || quotes.length === 0) {
      return null;
    }

    // When href is provided, match instrument.url exactly
    if (href) {
      const hrefPath = InvestingManager.extractPath(href);
      for (const quote of quotes) {
        if (InvestingManager.normalizePath(quote.url) === hrefPath) {
          return quote;
        }
      }
    }

    // Otherwise match name against description exactly (case-insensitive)
    const normalizedName = InvestingManager.normalizeText(name);
    for (const quote of quotes) {
      if (InvestingManager.normalizeText(quote.description) === normalizedName) {
        return quote;
      }
    }

    return null;
  }

  /**
   * Extract the pathname from a full Investing.com URL or return as-is for relative paths.
   */
  private static extractPath(href: string): string {
    try {
      const url = new URL(href);
      return url.pathname.replace(/\/+$/, '');
    } catch {
      return href.replace(/\/+$/, '');
    }
  }

  /**
   * Normalize path for comparison: remove trailing slash, lowercase.
   */
  private static normalizePath(path: string): string {
    return path.replace(/\/+$/, '').toLowerCase();
  }

  /**
   * Normalize text for comparison: lowercase, trim, collapse whitespace.
   */
  private static normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}
