import { IImdbHandler } from '../handler/imdb';
import { IImdbManager } from '../manager/imdb';
import { IMDB_CONSTANTS, SearchCommand, SearchEvent } from '../models/imdb';
import { Factory } from './factory';

export class ImdbApp {
  constructor(
    private readonly imdbHandler: IImdbHandler,
    private readonly imdbManager: IImdbManager
  ) {}

  public initialize(): void {
    // Always register
    GM.registerMenuCommand('Imdb Auto', () => void this.imdbHandler.handleAutoModeToggle());

    // Only initialize movie-specific features on movie pages
    if (this.imdbManager.isMovieTab()) {
      this.initializeMovieFeatures();
    } else {
      // Movie Search Tab
      GM.registerMenuCommand('List', () => this.imdbHandler.handleListMovies());
    }

    // FIXME: #B Register global Error Handler
  }

  private initializeMovieFeatures(): void {
    // Register menu commands
    GM.registerMenuCommand('YSearch', () => void this.imdbHandler.signalSearch(SearchCommand.YTS));
    GM.registerMenuCommand('XSearch', () => void this.imdbHandler.signalSearch(SearchCommand.X1337));
    GM.registerMenuCommand('Xtreme', () => void this.imdbHandler.signalSearch(SearchCommand.XTREME));
    GM.registerMenuCommand('Youtube Full', () => void this.imdbHandler.signalSearch(SearchCommand.YOUTUBE));

    // Register search event listener
    GM_addValueChangeListener(IMDB_CONSTANTS.EVENTS.SEARCH, (_key: string, _old: unknown, newValue: unknown) => {
      const searchEvent = newValue as SearchEvent;
      this.imdbHandler.processSearchEvent(searchEvent);
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

// @ts-expect-error Kept main for Imdb App
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function main(): void {
  console.info('Tamperfun Experiment started');
  const app = Factory.app.imdb();
  app.initialize();
}

// main();
