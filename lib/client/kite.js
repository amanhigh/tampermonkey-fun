/* Public Methods */
function createGTT(body) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + JSON.parse(localStorage.getItem("__storejs_kite_enctoken"))
        },
        url: "https://kite.zerodha.com/oms/gtt/triggers",
        data: encodeURI(body),
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                //console.log('GTT Created');
            } else {
                alert('Error Creating GTT: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Making Request: ' + response.statusText);
        }
    });
}

function loadGTT(callback) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + JSON.parse(localStorage.getItem("__storejs_kite_enctoken"))
        },
        url: "https://kite.zerodha.com/oms/gtt/triggers",
        method: "GET",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                //console.log('GTT List:' + this.responseText);
                callback(JSON.parse(this.responseText));
            } else {
                alert('Error Fetching GTT: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Making Request: ' + response.statusText);
        }
    });
}

function deleteGtt(id) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + JSON.parse(localStorage.getItem("__storejs_kite_enctoken")),
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        url: "https://kite.zerodha.com/oms/gtt/triggers/" + id,
        method: "DELETE",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(`Trigger Deleted -> ${id}`.fontcolor('green'));
            } else {
                alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function () {
            alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
        }
    });
}