// ==UserScript==
// @name         Trello
// @namespace    aman
// @version      1.0
// @description  Trello Utilities
// @author       Amanpreet Singh
// @match        https://trello.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @require      lib/library.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at document-idle
// ==/UserScript==

// ---------------------------- ALERT FEED -------------------------------
function labelCounter(target, color) {

    //Read only Non Hidden Card Labels
    $(target).find(`a.list-card:not(.hide)  span.card-label-${color}`).toArray()
        .reduce(function (rv, x) {
            //Extract Title
            let title = $(x).attr('title');

            //Count Occurrences
            rv[title] = (rv[title] || 0);
            rv[title]++;
            return rv;
        }, {});

}
