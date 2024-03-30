// GET http://localhost:9010/v1/ticker/test/record
function RecordTicker(ticker) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
        },
        url: "http://localhost:9010/v1/ticker/" + ticker + "/record",
        method: "GET",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                //console.log('Ticker Recorded');
                message(`Ticker Recorded: ${ticker}`.fontcolor('green'));
            } else {
                alert('Error Recording Ticker: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            alert('Error Making Request: ' + response.statusText);
        }
    })
}

// GET http://localhost:9010/v1/clip/
function GetClip(callback) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
        },
        url: "http://localhost:9010/v1/clip",
        method: "GET",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(`Clip: ${response.responseText}`.fontcolor('green'));
                callback(response.responseText);
            } else {
                alert('Error Reading Clipboard: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            alert('Error Making Request: ' + response.statusText);
        }
    })
}