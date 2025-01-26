import { MovieDetails, IMDB_CONSTANTS, SearchCommand, SearchEvent } from '../models/imdb';
import { IImdbRepo } from '../repo/imdb';

export interface IImdbManager {
  isMovieTab(): boolean;
  isAutoModeEnabled(): Promise<boolean>;
  setAutoMode(enabled: boolean): Promise<void>;
  openReviewPage(): void;
  getMovieDetails(): MovieDetails;
  createMovieSearch(command: SearchCommand): Promise<void>;
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
    const type = $(sel.TYPE).text();
    const language = $(sel.LANGUAGE).text();
    const rating = parseFloat($(sel.MOVIE_RATING).text());

    return {
      name: name.trim(),
      year: year ? year.replace(')', '').trim() : undefined,
      language,
      type,
      rating,
      userRating: this.getUserRating(),
      isGame: type.includes('Video Game'),
      ratingCutoff: this.calculateRatingCutoff(language, type),
    };
  }

  private calculateRatingCutoff(language: string, type: string): number {
    if (type.includes('Video Game')) {
      return 6.0;
    }
    if (language.includes('Punjabi') || language.includes('Hindi')) {
      return 5.0;
    }
    if (language.includes('English')) {
      return 6.5;
    }
    return 6.0;
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

  public async createMovieSearch(command: SearchCommand): Promise<void> {
    const event: SearchEvent = {
      command,
      date: Date.now(),
    };
    await GM.setValue(IMDB_CONSTANTS.EVENTS.SEARCH, JSON.stringify(event));
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
   * Opens the review page for current movie
   */
  public openReviewPage(): void {
    const reviewLink = $(IMDB_CONSTANTS.SELECTORS.REVIEW)[0] as HTMLAnchorElement;
    if (reviewLink?.href) {
      void GM.openInTab(reviewLink.href, false);
    }
  }
}
