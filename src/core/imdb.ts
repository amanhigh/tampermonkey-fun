import { IImdbHandler } from '../handler/imdb';
import { IImdbManager } from '../manager/imdb';
import { IGlobalErrorHandler } from '../handler/error';
import { IMDB_CONSTANTS } from '../models/imdb';
import { Factory } from './factory';

export class ImdbApp {
  constructor(
    private readonly imdbHandler: IImdbHandler,
    private readonly imdbManager: IImdbManager,
    private readonly errorHandler: IGlobalErrorHandler
  ) {}

  public initialize(): void {
    // Register error handlers first
    this.errorHandler.registerGlobalErrorHandlers();

    if (this.imdbManager.isMovieTab()) {
      GM.registerMenuCommand('Xtreme', () => this.imdbHandler.handleXtremeSearch());
    } else {
      // IMDb list and search results
      GM.registerMenuCommand('List', () => this.imdbHandler.handleListMovies());
    }
  }
}

export function RunImdb(): void {
  console.info('Imdb started');
  const app = Factory.app.imdb();
  app.initialize();
}

// RunImdb();
