export interface IImdbManager {
  isMovieTab(): boolean;
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
}
