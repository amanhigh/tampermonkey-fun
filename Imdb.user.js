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
const movieTitleSelector = '.title_wrapper > h1';
const movieRatingSelector = 'div.ratingValue > strong > span';
const myImdbRatingSelector = 'span.star-rating-value:first';
const languageSelector = '#titleDetails > div:contains("Language") > a';
const reviewSelector = 'div.titleReviewbarItemBorder span.subText > a:first';

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
    let auto =isImdbAuto();
    setImdbAuto(!auto);
});


//Init Setup
function imdbInit() {
    //Only for Movie Tabs
    if (getName() !== "") {
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
        if (isImdbAuto())
        {
            //Load, Filter and Trailer (Timeout to let myRating Load)
            setTimeout(imdbFilter, 3000);
        }
    }
}

imdbInit()

/* Commands */
function imdbFilterFire(cmd) {
    GM_setValue(imdbFilterKey, {command: cmd, date: new Date()});
}

function listMovies() {
    let links = $('span.lister-item-header a');
    openLinkSlowly(0, links);
}

function imdbFilter() {
    let name = getName();
    //Leave out List Tab
    let lang = $(languageSelector).text();
    let rating = parseFloat($(movieRatingSelector).text());
    let myRating = parseFloat($(myImdbRatingSelector).text());
    let cutoff = getCutoff(lang);

    //GM_notification(`Rating: ${rating} , MyRating: ${myRating}, Lang: ${lang}`, name);

    if (rating < cutoff || isNaN(rating)) {
        //GM_notification(`${rating} < ${cutoff} (${lang})`, name);
        window.close();
    } else if (myRating > 0) {
        //GM_notification(`Movie Watched: ${myRating}`, name);
        window.close();
    } else if (cutoff > 0) {
        //Trailed if Valid Language
        YoutubeSearch(name + " trailer");
        //Open Reviews
        GM_openInTab($(reviewSelector)[0].href, {"active": false, "insert": false});
    }
}

/* Helpers */
function getName() {
    return $(movieTitleSelector).text().trim();
}

function getNameWithoutYear(){
    return getName().split("(")[0].trim();
}

function isImdbAuto() {
    return GM_getValue(imdbAutoKey) || false;
}

function setImdbAuto(auto) {
    GM_setValue(imdbAutoKey, auto);
    GM_notification(`Value: ${auto}`, "Imdb Auto Changed");
}

function getCutoff(lang) {
    if (lang.includes("Punjabi") || lang.includes("Hindi")) {
        return 5
    } else if (lang.includes("English")) {
        return 6.5
    } else {
        alert("Unknown Language: " + lang);
    }
}

function openLinkSlowly(i, links) {
    setTimeout(() => {
        GM_openInTab(links[i].href, {"active": false, "insert": false});
        openLinkSlowly(i + 1, links);
    }, 2000);
}
