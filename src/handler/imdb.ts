import { IMDB_CONSTANTS, SearchCommand, SearchEvent } from '../models/imdb';
import { IImdbManager } from '../manager/imdb';
import { ISearchUtil } from '../util/search';
import { Notifier } from '../util/notify';

export interface IImdbHandler {
  handleListMovies(): void;
  handleAutoModeToggle(): Promise<void>;
  signalSearch(command: SearchCommand): Promise<void>;
  processSearchEvent(searchEvent: SearchEvent): void;
  handleImdbPreview(): void;
}

export class ImdbHandler implements IImdbHandler {
  constructor(
    private readonly imdbManager: IImdbManager,
    private readonly searchUtil: ISearchUtil
  ) {}

  public handleListMovies(): void {
    // Open links with delay to avoid browser blocking
    this.openLinksSlowly(0, $(IMDB_CONSTANTS.SELECTORS.LIST_LINKS));
  }

  public async handleAutoModeToggle(): Promise<void> {
    const currentState = await this.imdbManager.isAutoModeEnabled();
    await this.imdbManager.setAutoMode(!currentState);
    Notifier.success(`IMDB Auto Mode: ${!currentState ? 'Enabled' : 'Disabled'}`);
  }

  private openLinksSlowly(index: number, links: JQuery<HTMLElement>): void {
    setTimeout(() => {
      if (index < links.length) {
        const link = links[index];
        void GM.openInTab((link as HTMLAnchorElement).href, false);
        this.openLinksSlowly(index + 1, links);
      }
    }, 4000);
  }

  public async signalSearch(command: SearchCommand): Promise<void> {
    await this.imdbManager.createMovieSearch(command);
  }

  public processSearchEvent(searchEvent: SearchEvent): void {
    const movieTitle = this.imdbManager.getMovieDetails().name;

    switch (searchEvent.command) {
      case SearchCommand.YTS:
        this.searchUtil.ySearch(movieTitle);
        break;
      case SearchCommand.X1337:
        this.searchUtil.xSearch(movieTitle);
        break;
      case SearchCommand.XTREME:
        this.searchUtil.xtremeSearch(movieTitle);
        break;
      case SearchCommand.YOUTUBE:
        this.searchUtil.youtubeSearch(`${movieTitle} Full Movie`);
        break;
      case SearchCommand.BINGE:
        this.searchUtil.bingeSearch(movieTitle);
        break;
      default:
        Notifier.error(`Invalid Command: ${searchEvent.command}`);
    }
  }

  public handleImdbPreview(): void {
    // Open trailer/review based on type
    const details = this.imdbManager.getMovieDetails();
    const searchQuery = details.isGame ? `${details.name} review` : `${details.name} trailer`;

    // Direct search without event system
    this.searchUtil.youtubeSearch(searchQuery);

    // Open review page
    this.imdbManager.openReviewPage();
  }
}
