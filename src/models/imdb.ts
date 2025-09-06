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
  ratingCutoff: number; // Added
  isGame: boolean; // Added
}

/**
 * Constants for IMDB operations
 */
export enum SearchCommand {
  YTS = 'YSearch',
  X1337 = 'XSearch',
  XTREME = 'Xtreme',
  YOUTUBE = 'Youtube Full',
  BINGE = 'Binge',
}

export interface SearchEvent {
  command: SearchCommand;
  date: number;
}

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
  EVENTS: {
    SEARCH: 'imdbSearchEvent',
  },
};
