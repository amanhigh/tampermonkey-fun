// ==UserScript==
// @name        Experiment
// @namespace   aman
// @description Tamper Monkey Experiment Script
// @include     http://www.example.net/
// @version     1.0
// @require     lib/library.js
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM.xmlHttpRequest
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @downloadURL https://raw.githubusercontent.com/amanhigh/tampermonkey-fun/master/experiment.user.js
// ==/UserScript==

// Note that in most cases, updateURL and downloadURL
// is NOT NECESSARY. Greasemonkey will automatically 
// use the URL you used to download script
// Wiki: https://wiki.greasespot.net/Metadata_Block#.40downloadURL

// Use this to check if your script will update, among other things
// Wiki: https://wiki.greasespot.net/GM_info

function setup() {
    var input = document.createElement("input");
    input.id = "aman";
    input.type = "text";
    input.setAttribute("style", "font-size:" + 18 + "px;position:absolute;top:" + 100 + "px;right:" + 40 + "px;");

    var experiment = document.createElement("input");
    experiment.type = "button";
    experiment.value = "experiment";
    experiment.onclick = runExperiment;
    experiment.setAttribute("style", "font-size:" + 18 + "px;position:absolute;top:" + 140 + "px;right:" + 40 + "px;");

    var msg = document.createElement("p");
    msg.id = "msg";
    msg.setAttribute("style", "font-size:" + 18 + "px;position:absolute;top:" + 160 + "px;right:" + 40 + "px;");

    document.body.appendChild(input);
    document.body.appendChild(experiment);
    document.body.appendChild(msg);

    document.addEventListener('keydown', experiment_key, false);

    message("Script will " + (GM_info ? "" : "not ") + "update.");
}

setup();

/** ----------------------Code Below----------------------------- **/

function runExperiment() {
    apiTest()
}

function apiTest() {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0"
        },
        url: "https://in.investing.com/members-admin/alert-center",
        method: "GET",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                console.log($(response).find('#instrumentAlerts'));
            } else {
                alert('Error Firing: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Firing: ' + response.statusText);
        }
    });
}

function experiment_key(e) {
    //console.log(e);

    if (e.key === 'n' && isDoubleKey(n)) {
        message("Double Key Detected: " + e.key)
    }

}