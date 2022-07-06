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
const movieTitleSelector = 'h1';
const movieRatingSelector = 'div[data-testid*=aggregate-rating__score] > span';
const myImdbRatingSelector = 'div[data-testid*=user-rating__score] > span';
const typeSelector = 'ul[data-testid=hero-title-block__metadata] > li:first';
const languageSelector = 'li[data-testid=title-details-languages] .ipc-metadata-list-item__list-content-item';
const reviewSelector = '[class*=ReviewContent__StyledText]';

const listLinksSelector = 'span.lister-item-header a';

//Events
const imdbFilterKey = "imdbFilterKey";
const imdbAutoKey = "imdbAutoKey";

//***************IMDB ********************

//Commands
GM_registerMenuCommand("List", () => {
    listMovies();
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

GM_registerMenuCommand("Imdb Auto", () => {
    let auto = isImdbAuto();
    setImdbAuto(!auto);
});


//Init Setup
function imdbInit() {
    //Only for Movie Tabs
    if (isMovieTab()) {
        //Register Listenr
        GM_addValueChangeListener(
            imdbFilterKey, (keyName, oldValue, newValue) => {
                switch (newValue.command) {
                    case "YSearch":
                        YSearch(getNameWithoutYear());
                        break;
                    case "XSearch":
                        XSearch(getNameWithoutYear());
                        break;
                    case "Youtube Full":
                        YoutubeSearch(getName() + " Full Movie");
                        break
                    default:
                        alert("Invalid Command: " + newValue.command)
                }
            });

        //Check if we are in auto mode
        if (isImdbAuto()) {
            //Load, Filter and Trailer (Timeout to let myRating Load)
            setTimeout(imdbFilter, 3000);
        }
    }
}

imdbInit()

/* Commands */
function imdbFilterFire(cmd) {
    GM_setValue(imdbFilterKey, { command: cmd, date: new Date() });
}

function listMovies() {
    openLinkSlowly(0, $(listLinksSelector));
}

function imdbFilter() {
    let name = getName();
    //Leave out List Tab
    let lang = $(languageSelector).text();
    let type = $(typeSelector).text();
    let rating = parseFloat($(movieRatingSelector).text());
    let myRating = parseFloat($(myImdbRatingSelector).html());
    let cutoff = getCutoff(lang, type);


    console.log(`Rating: ${rating} , MyRating: ${myRating}, Lang: ${lang}, Name: ${name}, Cutoff: ${cutoff}, Type: ${type} `);

    if (rating < cutoff || isNaN(rating)) {
        //GM_notification(`${rating} < ${cutoff} (${lang})`, name);
        window.close();
    } else if (myRating > 0) {
        //GM_notification(`Movie Watched: ${myRating}`, name);
        window.close();
    } else if (cutoff > 0) {
        //Trailed if Valid Language
        SearchTitle(name, type);
        //Open Reviews
        GM_openInTab($(reviewSelector)[0].href, { "active": false, "insert": false });
    }
}

function SearchTitle(name, type) {
    let suffix = type.includes("Video Game") ? " review" : " trailer"
    YoutubeSearch(name + suffix);
}

/* Helpers */
function getName() {
    return $(movieTitleSelector).text().trim();
}

function getNameWithoutYear() {
    return getName().split("(")[0].trim();
}

function isMovieTab() {
    const p = window.location.pathname;
    return !(p.includes('reviews') || p.includes('search')) && p.includes('title');
}

function isImdbAuto() {
    return GM_getValue(imdbAutoKey) || false;
}

function setImdbAuto(auto) {
    GM_setValue(imdbAutoKey, auto);
    GM_notification(`Value: ${auto}`, "Imdb Auto Changed");
}

function getCutoff(lang, type) {
    if (type.includes("Video Game")) {
        return 6
    } else if (lang.includes("Punjabi") || lang.includes("Hindi")) {
        return 5
    } else if (lang.includes("English")) {
        return 6.5
    } else {
        alert("Unknown Language: " + lang);
    }
}

function openLinkSlowly(i, links) {
    setTimeout(() => {
        GM_openInTab(links[i].href, { "active": false, "insert": false });
        openLinkSlowly(i + 1, links);
    }, 4000);
}
