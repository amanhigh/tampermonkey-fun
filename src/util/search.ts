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
}

/**
 * Manages external search operations
 */
export class SearchUtil implements ISearchUtil {
  /** @inheritdoc */
  public youtubeSearch(query: string): void {
    void GM.openInTab(
      `https://www.youtube.com/results?search_query=${query}`,
      true // openInBackground
    );
  }

  /** @inheritdoc */
  public ySearch(query: string): void {
    void GM.openInTab(`https://yts.mx/browse-movies/${query}`, true);
  }

  /** @inheritdoc */
  public xSearch(query: string): void {
    void GM.openInTab(`https://www.1337x.to/search/${query}/1/`, true);
  }

  /** @inheritdoc */
  public xtremeSearch(query: string): void {
    void GM.openInTab(`https://www.airtelxstream.in/search/${query}?q=${query}`, true);
  }
}
