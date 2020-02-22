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

    //Add Buttons
    buildButton('aman-click', 'Run', runCounter()).appendTo('#aman-area');

    //Add Table
    buildTable('aman-table').appendTo('#aman-area');
}

setupUI();


//Handlers
function runCounter() {
    return () => {
        let testList = $('div.js-list.list-wrapper:contains("Not Taken")');
        let labelMap = labelCounter(testList, 'red').sort();
        let sortedMap = new Map([...labelMap.entries()].sort())

        //Empty previous Run
        $('#aman-table').empty();

        //Render New Rows
        sortedMap.forEach((label, count) => {
            let $row = buildRow().appendTo('#aman-table');
            $row.prepend(buildCell(label))
            $row.prepend(buildCell(count));
        })
    };
}

//Core
function labelCounter(target, color) {
    //Read only Non Hidden Card Labels
    return $(target).find(`a.list-card:not(.hide)  span.card-label-${color}`).toArray()
        .reduce(function (map, labelElement) {
            //Extract Title
            let title = $(labelElement).attr('title');

            //Count Occurrences
            if (map.has(title)) {
                map.set(title, map.get(title) + 1);
            } else {
                map.set(title, 1);
            }

            return map;
        }, new Map());
}

