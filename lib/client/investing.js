/* Constants */
const investingBaseUrl = "https://in.investing.com"

/* Public Methods */
function createAlert(pairId, price, callback) {
    //Auto Decide over under with ltp
    let ltp = getLastTradedPrice();
    let threshold = price > ltp ? 'over' : 'under';

    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: investingBaseUrl + "/useralerts/service/create",
        data: "alertType=instrument&alertParams%5Balert_trigger%5D=price&alertParams%5Bpair_ID%5D=" + pairId + "&alertParams%5Bthreshold%5D=" + threshold + "&alertParams%5Bfrequency%5D=Once&alertParams%5Bvalue%5D=" + price + "&alertParams%5Bplatform%5D=desktopAlertsCenter&alertParams%5Bemail_alert%5D=Yes",
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                callback(pairId, price);
                // console.log('Alert Created: ' + pairId + ',' + price + ',' + threshold);
            } else {
                alert('Error Creating Alert: ' + pairId + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Creating Alert: ' + pairId + ' : ' + response.statusText);
        }
    });
}

function deleteAlert(alert, callback) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: investingBaseUrl + "/useralerts/service/delete",
        data: `alertType=instrument&alertParams%5Balert_ID%5D=${alert.Id}&alertParams%5Bplatform%5D=desktop`,
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(`Delete -> ${alert.Price}`.fontcolor('red'));
                callback(alert.PairId, alert.Id);
                //console.log('Alert Deleted: ' + alert.Id);
            } else {
                alert('Error Deleting Alert: ' + alert.Id);
            }
        },
        onerror: function () {
            alert('Error Deleting Alert: ' + alert.Id);
        }
    });
}

/**
 * Search for a Cached symbol and execute a callback with the result. 
 * Optionally specify an exchange for Force Refresh of Cache.
 *
 * @param {string} symb - the symbol to search for
 * @param {function} callback - the callback function to execute with the search result
 * @param {string} [exchange=""] - the exchange to specify for cache override
 */
function searchSymbol(symb, callback, exchange = "") {
    let m = GM_getValue(pairMapStore, {});

    //Try for a Cache Hit. (Exchange Specified calls for cache override)
    if (m[symb] && exchange === "") {
        let top = m[symb];
        //console.log(`Cache Hit ${symb}-> ${top.name} ${top.pairId}`);
        callback(top);
    } else {
        //Call and fill cache

        GM.xmlHttpRequest({
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            url: investingBaseUrl + "/search/service/search?searchType=alertCenterInstruments",
            data: "search_text=" + symb + "&term=" + symb + "&country_id=0&tab_id=All",
            method: "POST",
            onload: function (response) {
                if (response.status >= 200 && response.status < 400) {
                    let r = JSON.parse(response.responseText);
                    //If Found
                    if (r.All.length > 0) {
                        //Try Search for Exchange
                        var top = r.All.find(res => exchange.toUpperCase() === res.exchange_name_short.toUpperCase());
                        if (!top) {
                            //Select Top Result if nothing found
                            top = r.All[0]
                        }
                        // console.log(r.All,top);

                        //Cache Top
                        message(`Mapped ${symb} -> ${top.name} (${top.exchange_name_short})`.fontcolor('yellow'));
                        let cacheTop = { name: top.name, pairId: top.pair_ID };
                        m[symb] = cacheTop;
                        GM_setValue(pairMapStore, m);
                        callback(cacheTop);
                    } else {
                        message(`No Results Found: ${symb}`.fontcolor('red'));
                    }
                } else {
                    message('Error doing Symbol Search: ' + symb + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
                }
            },
            onerror: function (response) {
                message('Error doing Symbol Search: ' + symb + ' : ' + response.statusText);
            }
        });
    }
}

/**
 * Fetch all Alerts for all Pair.
 */
function getAllAlerts(callback) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: investingBaseUrl + "/members-admin/alert-center",
        method: "GET",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                callback(response.response);
                //console.log("Alert Dump:" + response.response);
            } else {
                message('Error Creating Alert: ' + pairId + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            message(`Get All Alerts Failed  ${response.statusText}`.fontcolor('red'))
        }
    });
}