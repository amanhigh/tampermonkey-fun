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
// @run-at document-end
// ==/UserScript==
const colors = ['red', 'yellow', 'purple', 'green', 'sky', 'lime'];
const excludeList = ['Transit', 'Experiment', 'JustGot']


// ---------------------------- TRELLO -------------------------------
function setupUI() {
    //Setup Area
    buildArea('aman-area').appendTo('body');

    //Add Color Choices
    buildInput('aman-input').appendTo('#aman-area');
    buildWrapper('aman-colors').appendTo('#aman-area');
    colors.forEach(color => {
        buildRadio(color, color, 'aman-colors', color === colors[0]).appendTo('#aman-colors')
    })
    //Add Buttons
    buildButton('aman-run', 'Run', runCounter).appendTo('#aman-area');
    buildButton('aman-clear', 'Clear', clear).appendTo('#aman-area');

    //Add Table
    buildTable('aman-table').appendTo('#aman-area');

    $('#aman-area').css('left', '20%')

}

setupUI();


//Handlers
function clear() {
    $('#aman-table').empty();
}

function runCounter() {
    let selectedColor = $("input[name='aman-colors']:checked").val();
    let labelInfo = countAll(selectedColor);
    // let sortedMap = new Map([...labelMap.entries()].sort((a, b) => b[1] - a[1]))

    //Empty previous Run
    $('#aman-table').empty();

    //Build Header
    let $header = buildRow('aman-table-header-row').appendTo('#aman-table');
    $header.append(buildHeader('Tags'));

    //Render List Names in Header
    labelInfo.listNames.forEach(name => {
        $header.append(buildHeader(name));
    })

    //Render All Counts With Labels
    labelInfo.labels.forEach((list, label) => {
        let $row = buildRow().appendTo('#aman-table');
        $row.append(buildHeader(label))
        list.forEach(count => {
            $row.append(buildCell(count));
        })
    })
}

//Core
function countAll(color) {
    let labelInfo = {
        listNames: [],
        labels: new Map(),
    }

    $('div.js-list.list-wrapper').each((key, list) => {
        //Get Headings of all Lists
        let listName = $(list).find(".list-header-name").attr('aria-label');
        //For Selected Color, Get Count by Label Text for each List
        let labelMap = labelCounter(list, color);

        //Exclude Fixed Lists like JustGot
        if (!excludeList.includes(listName)) {

            //Add List Name to label info
            labelInfo.listNames.push(listName);

            //Copy all Labels already Known
            labelInfo.labels.forEach((list, label) => {
                if (labelMap.has(label)) {
                    list.push(labelMap.get(label))
                } else {
                    list.push(0);
                }
            })

            //Copy all undiscovered Labels
            labelMap.forEach((count, label) => {
                //Init Array if new Label
                if (!labelInfo.labels.has(label)) {
                    //Accommodate all lists processed till now
                    let counts = Array(labelInfo.listNames.length - 1).fill(0);
                    counts.push(count);
                    labelInfo.labels.set(label, counts);
                }
            })

            // console.log(listName, list, labelMap);
        }
    })
    // console.log(labelInfo)
    return labelInfo;
}

function labelCounter(target, color) {
    //Read only Non Hidden Card Labels having labels of Target Color
    return $(target).find(`a.list-card:not(.hide)  button[data-color="${color}"]`).toArray()
        .reduce(function (map, labelElement) {
            //Extract Text of Label
            let title = $(labelElement).text();
            //Add Prefix from Input (Optional)
            title = $("#aman-input").val() + title;

            //Count Occurrences
            if (map.has(title)) {
                map.set(title, map.get(title) + 1);
            } else {
                map.set(title, 1);
            }

            return map;
        }, new Map());
}