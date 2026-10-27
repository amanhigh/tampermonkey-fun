import { IMDB_CONSTANTS } from '../models/imdb';

export interface IImdbHandler {
  handleListMovies(): void;
}

export class ImdbHandler implements IImdbHandler {
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
}
