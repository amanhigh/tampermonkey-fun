/**
 * Interface for external search operations
 */
export interface ISearchUtil {
  /**
   * Opens YouTube search in new tab
   * @param query - Search query for YouTube
   */
  youtubeSearch(query: string): void;

  /**
   * Opens YTS movies search in new tab
   * @param query - Search query for YTS
   */
  ySearch(query: string): void;

  /**
   * Opens 1337x search in new tab
   * @param query - Search query for 1337x
   */
  xSearch(query: string): void;

  /**
   * Opens Airtel Xtreme search in new tab
   * @param query - Search query for Xtreme
   */
  xtremeSearch(query: string): void;

  /**
   * Opens Tata Play Binge search in new tab
   * @param query - Search query for Binge
   */
  bingeSearch(query: string): void;
}

/**
 * Manages external search operations
 */
export class SearchUtil implements ISearchUtil {
  /** @inheritdoc */
  public youtubeSearch(query: string): void {
    void GM.openInTab(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      true // openInBackground
    );
  }

  /** @inheritdoc */
  public ySearch(query: string): void {
    void GM.openInTab(`https://yts.mx/browse-movies/${encodeURIComponent(query)}`, true);
  }

  /** @inheritdoc */
  public xSearch(query: string): void {
    void GM.openInTab(`https://www.1337x.to/search/${encodeURIComponent(query)}/1/`, true);
  }

  /** @inheritdoc */
  public xtremeSearch(query: string): void {
    void GM.openInTab(
      `https://www.airtelxstream.in/search/${encodeURIComponent(query)}?q=${encodeURIComponent(query)}`,
      true
    );
  }

  /** @inheritdoc */
  public bingeSearch(query: string): void {
    void GM.openInTab(`https://www.tataplaybinge.com/search?q=${encodeURIComponent(query)}`, true);
  }
}
