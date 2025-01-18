import { MovieDetails, IMDB_CONSTANTS } from '../models/imdb';
import { IImdbRepo } from '../repo/imdb';

export interface IImdbManager {
  isMovieTab(): boolean;
  getMovieDetails(): MovieDetails;
  isAutoModeEnabled(): Promise<boolean>;
  getRatingCutoff(details: MovieDetails): number;
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
}
