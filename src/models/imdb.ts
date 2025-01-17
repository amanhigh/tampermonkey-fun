/**
 * Search platform types
 */
export enum SearchType {
  YTS = 'YTS',
  X1337 = '1337X',
  XTREME = 'XTREME',
  YOUTUBE = 'YOUTUBE',
}

/**
 * Movie details from IMDB page
 */
export interface MovieDetails {
  name: string;
  year?: string;
  language: string;
  type: string;
  rating: number;
  userRating?: number;
}

/**
 * Constants for IMDB operations
 */
export const IMDB_CONSTANTS = {
  SELECTORS: {
    MOVIE_TITLE: 'h1',
    MOVIE_RATING: 'div[data-testid*=aggregate-rating__score] > span',
    USER_RATING: 'div[data-testid*=user-rating__score] > span',
    TYPE: 'ul[data-testid=hero-title-block__metadata] > li:first',
    LANGUAGE: 'li[data-testid=title-details-languages] .ipc-metadata-list-item__list-content-item',
    REVIEW: '[class*=ReviewContent__StyledText]',
    LIST_LINKS: 'a.ipc-title-link-wrapper',
  },
  STORAGE: {
    AUTO_MODE: 'imdbAutoMode',
  },
};
