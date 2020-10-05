// ==UserScript==
// @name         Historical
// @namespace    aman
// @version      1.0
// @description  Historical Data Download
// @author       Amanpreet Singh
// @match        https://www.investing.com/*historical-data
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/ui.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==

const downloadEvent = "historyDownloadEvent";

function HistoricalData() {
    SetupHistoricalUI();

    //Add Download Event Listener
    GM_addValueChangeListener(downloadEvent, download);
}

function SetupHistoricalUI() {
    buildArea(areaId, '65%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("aman-historical", 'Download', triggerDownload))
}

function triggerDownload() {
    //Trigger Event for all Tabs to Start Downloading
    GM_setValue(downloadEvent, new Date());
}

function download() {
    message('Downloading Historical Data'.fontcolor('green'));

    //Open Picker
    $(".calendarDatePicker").click();

    setTimeout(() => {

        //End Date
        $('.ui-state-active:last').get(0).click();

        moveBack(() => {
            //Start Date
            waitClick('.ui-state-default', () => {

                //Apply
                waitClick('#applyBtn', () => {

                    //Download
                    setTimeout(() => {
                        waitClick('.downloadBlueIcon')
                    }, 4000);

                });
            });
        });
    }, 1000);
}

//TODO:Extract General Iterate Loop Function to Lib
function moveBack(callback, count = 3) {
    waitClick('.ui-datepicker-prev');

    if (count > 0) {
        console.log(count);
        setTimeout(() => {
            moveBack(callback, count - 1)
        }, 1000);
    } else {
        callback();
    }
}

HistoricalData();