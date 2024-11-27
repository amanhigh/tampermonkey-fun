/**
 * Manages external search operations
 */
export class SearchUtil {
    public youtubeSearch(query: string): void {
        void GM.openInTab(
            `https://www.youtube.com/results?search_query=${query}`, 
            true // openInBackground
        );
    }
    
    public ySearch(query: string): void {
        void GM.openInTab(
            `https://yts.mx/browse-movies/${query}`, 
            true
        );
    }
    
    public xSearch(query: string): void {
        void GM.openInTab(
            `https://www.1337x.to/search/${query}/1/`, 
            true
        );
    }
    
    public xtremeSearch(query: string): void {
        void GM.openInTab(
            `https://www.airtelxstream.in/search/${query}?q=${query}`, 
            true
        );
    }
}
