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

//Events
const imdbFilterKey = "imdbFilterKey"

//***************IMDB ********************
GM_registerMenuCommand("Filter", () => {
    imdbFilterFire("en")
});

GM_addValueChangeListener(
    imdbFilterKey, (keyName, oldValue, newValue) => {
        console.log(newValue);
        imdbFilter(newValue.lang)
    });


function imdbFilterFire(lang) {
    GM_setValue(imdbFilterKey, {lang: lang, date: new Date()});
}

function imdbFilter(lang) {
    console.log(lang)
    let name = $(movieTitleSelector).text();
    let rating = parseFloat($(movieRatingSelector).text());
    let cutoff = 7;

    if (rating < cutoff) {
        GM_notification(`${rating} < ${cutoff} (${lang}) discarded`, name);
        window.close();
    } else
        YoutubeSearch(name + " trailer")
}
