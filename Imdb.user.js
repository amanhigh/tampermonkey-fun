// ==UserScript==
// @name         IMDB
// @namespace    aman
// @version      1.0
// @description  Imdb Fast Movie Scan
// @author       Amanpreet Singh
// @match        https://www.imdb.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        window.close
// @require      lib/library.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==

//Selectors
const movieTitleSelector = '.TitleHeader__TitleText-sc-1wu6n3d-0';
const movieRatingSelector = 'span.AggregateRatingButton__RatingScore-sc-1il8omz-1';
const myImdbRatingSelector = 'span.UserRatingButton__RatingScore-sc-15ploje-1';
const languageSelector = 'li[data-testid="title-details-languages"] a';

//Events
const imdbFilterKey = "imdbFilterKey"

//***************IMDB ********************
GM_registerMenuCommand("List", () => {
    listMovies();
});
GM_registerMenuCommand("Filter", () => {
    imdbFilterFire("Filter");
});
GM_registerMenuCommand("YSearch", () => {
    imdbFilterFire("YSearch");
});
GM_registerMenuCommand("XSearch", () => {
    imdbFilterFire("XSearch");
});
GM_registerMenuCommand("Youtube Full", () => {
    imdbFilterFire("Youtube Full");
});


GM_addValueChangeListener(
    imdbFilterKey, (keyName, oldValue, newValue) => {
        switch (newValue.command) {
            case "Filter":
                imdbFilter();
                break;
            case "YSearch":
                YSearch(getName());
                break;
            case "XSearch":
                XSearch(getName());
                break;
            case "Youtube Full":
                YoutubeSearch(getName() + " Full Movie");
                break
            default:
                alert("Invalid Command: " + newValue.command)
        }
    });

function listMovies() {
    $('span.lister-item-header a').each((i, e) => {
        GM_openInTab(e.href, {"active": false});
    })
}

function imdbFilterFire(cmd) {
    GM_setValue(imdbFilterKey, {command: cmd, date: new Date()});
}

function imdbFilter() {
    let name = getName();
    let lang = $(languageSelector).text();
    let rating = parseFloat($(movieRatingSelector).text());
    let myRating = parseFloat($(myImdbRatingSelector).text());
    let cutoff = getCutoff(lang);

    //GM_notification(`Debug: ${rating} , ${myRating}, ${lang}`, name);

    if (rating < cutoff || isNaN(rating)) {
        GM_notification(`${rating} < ${cutoff} (${lang}) discarded`, name);
        window.close();
    } else if (myRating > 0) {
        GM_notification(`Movie Watched: ${myRating} discarded`, name);
        window.close();
    } else if (cutoff > 0) {
        //Trailed if Valid Language
        YoutubeSearch(name + " trailer")
    }
}

function getName() {
    return $(movieTitleSelector).text();
}

function getCutoff(lang) {
    switch (lang) {
        case "Punjabi":
        case "Hindi":
            return 5;
        case "English":
            return 7;
        default:
            alert("Unknown Language: " + lang)
    }
}
