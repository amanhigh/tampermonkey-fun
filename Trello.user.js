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
const colors = ['red', 'yellow', 'purple', 'green', 'all'];
const excludeList = ['Transit', 'Experiment','JustGot']


// ---------------------------- TRELLO -------------------------------
function setupUI() {
    //Setup Area
    buildArea('aman-area').css('left', '80%').appendTo('body');

    // Add Input
    buildInput('aman-input').val('Not Taken').appendTo('#aman-area');

    //Add Color Choices
    buildWrapper('aman-colors').appendTo('#aman-area');
    colors.forEach(color => {
        buildRadio(color, color, 'aman-colors', color === colors[0]).appendTo('#aman-colors')
    })
    //Add Buttons
    buildButton('aman-run', 'Run', runCounter).appendTo('#aman-area');

    //Add Table
    buildTable('aman-table').appendTo('#aman-area');
}

setupUI();


//Handlers
function runCounter() {
    // let listName = $('#aman-input').val();
    // let testList = $(`div.js-list.list-wrapper:contains(${listName})`);

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
        let listName = $(list).find(".list-header-name").attr('aria-label');
        let labelMap = labelCounter(list, color);

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

