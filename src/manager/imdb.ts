import { IMDB_CONSTANTS } from '../models/imdb';

export interface IImdbManager {
  isMovieTab(): boolean;
  getMovieTitle(): string;
}

/**
 * Manages IMDB page operations and business logic
 */
export class ImdbManager implements IImdbManager {
  /**
   * Checks if current path is a valid movie page
   */
  public isMovieTab(): boolean {
    const path = window.location.pathname;
    return path.includes('title') && !path.includes('reviews') && !path.includes('search');
  }

  /**
   * Extracts the title from the current IMDb page
   */
  public getMovieTitle(): string {
    const fullTitle = $(IMDB_CONSTANTS.SELECTORS.MOVIE_TITLE).text().trim();
    const [title] = fullTitle.split('(');
    return title.trim();
  }
}
