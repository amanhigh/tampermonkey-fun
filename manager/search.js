/**
 * Manages external search operations
 */
class SearchManager {
    YoutubeSearch(query) {
        GM_openInTab("https://www.youtube.com/results?search_query=" + query, { "active": false, "insert": true });
    }
    
    YSearch(query) {
        GM_openInTab("https://yts.mx/browse-movies/" + query, { "active": false, "insert": true });
    }
    
    XSearch(query) {
        GM_openInTab("https://www.1337x.to/search/" + query + "/1/", { "active": false, "insert": true });
    }
    
    XtremeSearch(query) {
        GM_openInTab("https://www.airtelxstream.in/search/" + query + "?q=" + query, { "active": false, "insert": true });
    }
}