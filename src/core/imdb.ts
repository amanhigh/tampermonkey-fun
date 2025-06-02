import { IImdbHandler } from '../handler/imdb';
import { IImdbManager } from '../manager/imdb';
import { IGlobalErrorHandler } from '../handler/error';
import { IMDB_CONSTANTS, SearchCommand, SearchEvent } from '../models/imdb';
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

    // Always register
    GM.registerMenuCommand('Imdb Auto', () => void this.imdbHandler.handleAutoModeToggle());

    // Only initialize movie-specific features on movie pages
    if (this.imdbManager.isMovieTab()) {
      this.initializeMovieFeatures();
    } else {
      // Movie Search Tab
      GM.registerMenuCommand('List', () => this.imdbHandler.handleListMovies());
    }
  }

  private initializeMovieFeatures(): void {
    // Register menu commands
    GM.registerMenuCommand('YSearch', () => void this.imdbHandler.signalSearch(SearchCommand.YTS));
    GM.registerMenuCommand('XSearch', () => void this.imdbHandler.signalSearch(SearchCommand.X1337));
    GM.registerMenuCommand('Xtreme', () => void this.imdbHandler.signalSearch(SearchCommand.XTREME));
    GM.registerMenuCommand('Youtube Full', () => void this.imdbHandler.signalSearch(SearchCommand.YOUTUBE));
    GM.registerMenuCommand('Binge', () => void this.imdbHandler.signalSearch(SearchCommand.BINGE));

    // Register search event listener
    GM_addValueChangeListener(IMDB_CONSTANTS.EVENTS.SEARCH, (_key: string, _old: unknown, newValue: unknown) => {
      // Ensure newValue is a string before parsing, as GM_addValueChangeListener can provide various types.
      if (typeof newValue === 'string') {
        const searchEvent = JSON.parse(newValue) as SearchEvent;
        this.imdbHandler.processSearchEvent(searchEvent);
      } else {
        console.error('Received non-string value for search event:', newValue);
      }
    });

    // Add auto preview initialization
    void this.initializeAutoPreview();
  }

  private async initializeAutoPreview(): Promise<void> {
    if (await this.imdbManager.isAutoModeEnabled()) {
      // Add small delay to ensure page is fully loaded
      setTimeout(() => {
        this.imdbHandler.handleImdbPreview();
      }, 3000);
    }
  }
}

export function RunImdb(): void {
  console.info('Imdb started');
  const app = Factory.app.imdb();
  app.initialize();
}

// RunImdb();
