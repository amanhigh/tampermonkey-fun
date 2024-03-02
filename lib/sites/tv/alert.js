//Fast Alert: Delete
function onAlertDelete(evt) {
    let $target = $(evt.currentTarget);
    let alt = $target.data('alt');
    deleteAlert(alt, removeAlert);
}

function resetAlerts() {
    //Go over Alert Buttons
    $('#aman-altz > button').each((i, e) => {
        $(e).click();
    });
}

function autoAlertDelete() {
    autoAlert((altPrice) => {
        //Tolerance for price search (3%)
        let tolerance = altPrice * 0.03;

        //Go over Alert Buttons
        $('#aman-altz > button').each((i, e) => {
            let $e = $(e);
            let buttonPrice = parseFloat($e.text());
            //Delete Alert if its near alert Price
            if ((altPrice - tolerance) < buttonPrice && buttonPrice < (altPrice + tolerance)) {
                $e.click();
            }
        });
    })
}


/**
 * Filters Price Alerts and maps to price,id
 * @param alrts Alerts Response
 * @returns {{name: any, triggers: (number|{price: number, id: any}[])}}
 */
function getTriggers(alrts) {
    let triggers = alrts.data.data.price && alrts.data.data.price.filter(p => p.alert_trigger === "price").map(p => {
        return { id: p.alertId, price: parseFloat(p.conditionValue) };
    });
    let result = { name: alrts.data.data.pairData.name, triggers: triggers };
    message(`Altz: ${result.name} - ${result.triggers ? result.triggers.length : 0}`.fontcolor('green'))
    return result;

}

//Fast Alert: Summary
function altRefresh() {
    waitOn('altRefresh', 10, () => {
        //Locally Refresh Alerts
        sendAlertRequest();
    });
}

function sendAlertRequest() {
    //Search Symbol
    let symb = getMappedTicker();

    //Explicitly Clear alerts to avoid stale alerts.
    $(`#${altzId}`).empty();

    if (!orderSet.get(7).has(symb)) {
        //Skip Composite Symbols
        searchSymbol(symb, function (top) {
            //TODO: Cleanup
            // GM_setValue(alertRequestKey, {id: top.pairId, date: new Date()});
            alertSummary(alertMap.get(top.pairId))
        });
    }
}

function alertSummary(alertData) {
    let ltp = readLastTradedPrice();
    let $altz = $(`#${altzId}`);

    // Add Alert Buttons
    if (alertData) {
        alertData.sort(((a, b) => {
            return a.Price - b.Price;
        })).forEach((alt) => {
            let priceString = alt.Price.toString();
            //Alert Below Price -> Green, Above -> Red, Unverified -> Orange
            let coloredPrice = alt.Id === undefined ? priceString.fontcolor('orange') : alt.Price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            //Add Deletion Button
            buildButton("", coloredPrice, onAlertDelete).data('alt', alt).appendTo($altz);
        });
    } else {
        buildLabel("No AlertZ", 'red').appendTo($altz);
    }
}

function fetchAlerts() {
    getAllAlerts(saveAlerts);
}

/**
 * Parses Alert Data and loads into Alert Map
 * @param data
 */
function saveAlerts(data) {
    alertMap = new Map();
    let count = 0

    //Parse Html Data and extract price alerts
    $('<div/>').html(data).find('.js-alert-item[data-trigger=price]').each((i, alertText) => {
        const $alt = $(alertText);

        //Construct Alert
        let alert = new Alert();
        alert.Id = $alt.attr('data-alert-id');
        alert.Price = parseFloat($alt.attr('data-value'));
        alert.PairId = parseFloat($alt.attr('data-pair-id'));

        //Get Alerts for this Alert Name
        let alerts = alertMap.get(alert.PairId) || [];
        //Add Alert
        count++
        alerts.push(alert)
        //Update Map
        alertMap.set(alert.PairId, alerts);
    });

    //console.log(alertMap);
    message("Alerts Loaded: " + count)

    //Reload UI Alerts
    altRefresh();
}

/**
 * Add Alert without Alert Id
 * @param pairId
 * @param price
 */
function addAlert(pairId, price) {
    let alerts = alertMap.get(pairId) || [];
    alerts.push(new Alert(pairId, price));
    alertMap.set(pairId, alerts);

    altRefresh();
}

/**
 * Removes Alert from Alert Map. Doesn't save it.
 * @param pairId
 * @param alertId
 */
function removeAlert(pairId, alertId) {
    let alerts = alertMap.get(pairId) || [];
    alerts = alerts.filter(item => item.Id != alertId)
    alertMap.set(pairId, alerts);

    altRefresh();
}

function setAlert() {
    let symb = getMappedTicker();
    let price = $(`#${priceId}`).val();

    if (price) {
        //Split Alert Prices
        let split = price.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
                createAlert(top.pairId, p, addAlert);
            }

            //Clear Values
            setTimeout(clearFields, 10000);
        });
    }
}

/**
 * Trigger AutoAlert Create by reading Price and creating alert.
 */
function autoAlertCreate() {
    autoAlert((altPrice) => {
        searchSymbol(getMappedTicker(), function (top) {
            createAlert(top.pairId, altPrice, addAlert);
        });
    })
}
