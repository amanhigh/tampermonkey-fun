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
                alert('Error Creating Alert: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Making Request: ' + response.statusText);
        }
    });
}

function deleteGTT(symbol) {
    var triggers = $(".gtt-list-section tr").filter(function () {
        var $this = $(this);
        var status = $this.find("td.status span span").text();
        var quantity = $this.find("td.quantity span").text();
        var sym = $this.find("span.tradingsymbol span").text();
        if (status == "ACTIVE" && sym == symbol) {
            //console.log(symbol,'->',quantity);
            return true;
        }
    }).map(function () {
        return $(this).attr('data-uid')
    });

    //console.log(`Delete GTT: ${symbol} -> ${triggers.length}`);

    if (triggers.length == 0) {
        message(`No Triggers Found for ${symbol}`);
    } else if (triggers.length > 2) {
        message(`Multiple Triggers<br/> found for ${symbol} can't delete: ${triggers.length}`);
    } else {
        for (var id of triggers) {
            _deleteTrigger(id);
        }
    }
}


/* Private Methods */
function _deleteTrigger(id) {
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
                message('Trigger Deleted ->' + id);
            } else {
                alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
        }
    });
}