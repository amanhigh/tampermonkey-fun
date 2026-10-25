import { IMDB_CONSTANTS } from '../models/imdb';
import { IImdbManager } from '../manager/imdb';

export interface IImdbHandler {
  handleListMovies(): void;
  handleXtremeSearch(): void;
}

export class ImdbHandler implements IImdbHandler {
  constructor(private readonly imdbManager: IImdbManager) {}

  public handleListMovies(): void {
    // Open links with delay to avoid browser blocking
    this.openLinksSlowly(0, $(IMDB_CONSTANTS.SELECTORS.LIST_LINKS));
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

  public handleXtremeSearch(): void {
    const movieTitle = this.imdbManager.getMovieTitle();
    const searchUrl = 'https://www.airtelxstream.in/search?q=' + encodeURIComponent(movieTitle);
    void GM.openInTab(searchUrl, true);
  }
}
