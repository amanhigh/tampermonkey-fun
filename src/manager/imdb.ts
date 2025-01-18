import { MovieDetails, IMDB_CONSTANTS, SearchCommand, SearchEvent } from '../models/imdb';
import { IImdbRepo } from '../repo/imdb';

export interface IImdbManager {
  isMovieTab(): boolean;
  getMovieDetails(): MovieDetails;
  isAutoModeEnabled(): Promise<boolean>;
  setAutoMode(enabled: boolean): Promise<void>;
  getRatingCutoff(details: MovieDetails): number;
  createSearchEvent(command: SearchCommand): Promise<void>;
  getMovieTitle(): string;
  isGameType(details: MovieDetails): boolean;
  openReviewPage(): void;
  // FIXME: #C Reduce Public Functions
}

/**
 * Manages IMDB page operations and business logic
 */
export class ImdbManager implements IImdbManager {
  constructor(private readonly imdbRepo: IImdbRepo) {}

  /**
   * Checks if current path is a valid movie page
   */
  public isMovieTab(): boolean {
    const path = window.location.pathname;
    return path.includes('title') && !path.includes('reviews') && !path.includes('search');
  }

  /**
   * Extracts movie details from page DOM
   * @throws Error if required elements not found
   */
  public getMovieDetails(): MovieDetails {
    const sel = IMDB_CONSTANTS.SELECTORS;

    // Get name without year
    const fullName = $(sel.MOVIE_TITLE).text().trim();
    const [name, year] = fullName.split('(');

    return {
      name: name.trim(),
      year: year ? year.replace(')', '').trim() : undefined,
      language: $(sel.LANGUAGE).text(),
      type: $(sel.TYPE).text(),
      rating: parseFloat($(sel.MOVIE_RATING).text()),
      userRating: this.getUserRating(),
    };
  }

  /**
   * Gets auto mode status from repository
   */
  public async isAutoModeEnabled(): Promise<boolean> {
    return await this.imdbRepo.getAutoMode();
  }

  public async setAutoMode(enabled: boolean): Promise<void> {
    await this.imdbRepo.setAutoMode(enabled);
  }

  public async createSearchEvent(command: SearchCommand): Promise<void> {
    // FIXME: Move to Repo Layer ?
    const event: SearchEvent = {
      command,
      date: Date.now(),
    };
    await GM.setValue(IMDB_CONSTANTS.EVENTS.SEARCH, JSON.stringify(event));
  }

  public getMovieTitle(): string {
    // FIXME: #C Is it already in Details ?
    const fullTitle = $(IMDB_CONSTANTS.SELECTORS.MOVIE_TITLE).text().trim();
    return fullTitle.split('(')[0].trim();
  }

  /**
   * Determines rating cutoff based on movie type and language
   * @param details Movie details to check
   */
  public getRatingCutoff(details: MovieDetails): number {
    if (details.type.includes('Video Game')) {
      return 6.0;
    }

    if (details.language.includes('Punjabi') || details.language.includes('Hindi')) {
      return 5.0;
    }

    if (details.language.includes('English')) {
      return 6.5;
    }

    // Default cutoff for unknown languages
    console.warn(`Unknown language: ${details.language}, using default cutoff`);
    return 6.0;
  }

  /**
   * Extracts user rating from page if available
   * @private
   */
  private getUserRating(): number | undefined {
    const ratingText = $(IMDB_CONSTANTS.SELECTORS.USER_RATING).text();
    return ratingText ? parseFloat(ratingText) : undefined;
  }

  /**
   * Checks if movie is a game type
   */
  public isGameType(details: MovieDetails): boolean {
    // FIXME: #C Move to Details
    return details.type.includes('Video Game');
  }

  /**
   * Opens the review page for current movie
   */
  public openReviewPage(): void {
    const reviewLink = $(IMDB_CONSTANTS.SELECTORS.REVIEW)[0] as HTMLAnchorElement;
    if (reviewLink?.href) {
      void GM.openInTab(reviewLink.href, false);
    }
  }
}
