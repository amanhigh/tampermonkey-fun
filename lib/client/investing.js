/* Constants */
const pairMapKey = "pairMapKey";

/* Public Methods */
function createAlert(pairId, price) {
    //Auto Decide over under with ltp
    let ltp = readLtp();
    let threshold = price > ltp ? 'over' : 'under';

    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: "https://in.investing.com/useralerts/service/create",
        data: "alertType=instrument&alertParams%5Balert_trigger%5D=price&alertParams%5Bpair_ID%5D=" + pairId + "&alertParams%5Bthreshold%5D=" + threshold + "&alertParams%5Bfrequency%5D=Once&alertParams%5Bvalue%5D=" + price + "&alertParams%5Bplatform%5D=desktopAlertsCenter&alertParams%5Bemail_alert%5D=Yes",
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(`${threshold}: ${price}`.fontcolor(threshold === 'over' ? 'red' : 'green'));
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

function deleteAlert(alert) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: "https://in.investing.com/useralerts/service/delete",
        data: `alertType=instrument&alertParams%5Balert_ID%5D=${alert.id}&alertParams%5Bplatform%5D=desktop`,
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(`Delete -> ${alert.price}`.fontcolor('red'));
                //console.log('Alert Deleted: ' + alert.id);
            } else {
                alert('Error Deleting Alert: ' + alert.id);
            }
        },
        onerror: function () {
            alert('Error Deleting Alert: ' + alert.id);
        }
    });
}

function searchSymbol(symb, callback) {
    let m = GM_getValue(pairMapKey);
    //Init m If not preset
    m = m ? m : {};

    //Try for a Cache Hit
    if (m[symb]) {
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
            url: "https://in.investing.com/search/service/search?searchType=alertCenterInstruments",
            data: "search_text=" + symb + "&term=" + symb + "&country_id=0&tab_id=All",
            method: "POST",
            onload: function (response) {
                if (response.status >= 200 && response.status < 400) {
                    let r = JSON.parse(response.responseText);
                    //If Found
                    if (r.All.length > 0) {
                        //Select Top Result
                        let top = r.All[0]
                        //console.log(top);

                        //Cache Top
                        let cacheTop = {name: top.name, pairId: top.pair_ID};
                        m[symb] = cacheTop;
                        GM_setValue(pairMapKey, m);
                        callback(cacheTop);
                    } else {
                        message(`No Results Found: ${symb}`.fontcolor('red'));
                    }
                } else {
                    alert('Error doing Symbol Search: ' + symb + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
                }
            },
            onerror: function (response) {
                alert('Error doing Symbol Search: ' + symb + ' : ' + response.statusText);
            }
        });
    }
}

/**
 * Fetch all Alerts for given Pair.
 * @param pairId PairId to get Alerts
 * @param token Security Token for Session
 */
//TODO: Solve Cross Origin XHR Using GM_XmlHttpRequest (with Credentials) when available
function getAlerts(pairId, token, callback) {
    fetch("https://in.investing.com/alerts/instrument-data?pair_ID=" + pairId, {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0",
            "Accept": "application/json, text/javascript, /; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "is-service": "1",
            "ref-uri": "/equities/adani-enterprises",
            "token": token,
            "X-Requested-With": "XMLHttpRequest"
        },
        "referrer": "https://in.investing.com/equities/adani-enterprises",
        "method": "GET",
        "mode": "cors"
    }).then((response) => {
        return response.json();
    }).then((json) => {
        callback(json);
    }).catch(function (error) {
        alert('Get Alerts Failed' + error)
    });
}