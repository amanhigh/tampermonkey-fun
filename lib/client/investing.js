/* Constants */
const investingBaseUrl = "https://in.investing.com"

/* Public Methods */
function createAlert(name, pairId, price, callback) {
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
                callback(name, pairId, price);
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
 * Fetch symbol data from the investing.com API
 * @param {string} symb - the symbol to search for
 * @param {string} [exchange=""] - the exchange to specify for filtering results
 * @returns {Promise<PairInfo>} - Promise resolving to the PairInfo object
 */
function fetchSymbolData(symb, exchange = "") {
    return new Promise((resolve, reject) => {
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
                    if (r.All.length > 0) {
                        let top = r.All.find(res => exchange.toUpperCase() === res.exchange_name_short.toUpperCase()) || r.All[0];
                        resolve(new PairInfo(top.name, top.pair_ID));
                    } else {
                        reject(new Error(`No Results Found: ${symb}`));
                    }
                } else {
                    reject(new Error(`Error doing Symbol Search: ${symb} (${response.status} ${response.statusText}): ${response.responseText}`));
                }
            },
            onerror: function (response) {
                reject(new Error(`Error doing Symbol Search: ${symb} : ${response.statusText}`));
            }
        });
    });
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