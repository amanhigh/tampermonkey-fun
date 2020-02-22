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
// @require      lib/ui.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at document-idle
// ==/UserScript==

// ---------------------------- TRELLO -------------------------------
function setupUI() {
//Setup Area
    buildArea('aman-area').appendTo('body');

// Add Input
    buildInput('aman-input').appendTo('#aman-area');
    buildInput('aman-output').width(200).height(300).appendTo('#aman-area');

//Add Buttons
    buildButton('aman-click', 'Run', runCounter()).appendTo('#aman-area');
}

setupUI();

//Handlers
function runCounter() {
    return () => {
        let testList = $('div.js-list.list-wrapper:contains("Running")');
        let count = labelCounter(testList, 'yellow');
        console.log(count);
        $('#aman-output').val(JSON.stringify(count));
    };
}

//Core
function labelCounter(target, color) {
    //Read only Non Hidden Card Labels
    return $(target).find(`a.list-card:not(.hide)  span.card-label-${color}`).toArray()
        .reduce(function (rv, x) {
            //Extract Title
            let title = $(x).attr('title');

            //Count Occurrences
            rv[title] = (rv[title] || 0);
            rv[title]++;
            return rv;
        }, {});

}

