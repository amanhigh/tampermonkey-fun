//Events
const tvWatchChangeEvent = "tvWatchChangeEvent";
const alertClickedEvent = "alertClickedEvent";
const tokenChangedEvent = "tokenChangedEvent";

//UI Ids
const hookId = 'aman-hook';

//Mem Store
var trimmedNameMap;
var dataSiloInvesting = {};

//************** Investing *********************
function alertCenter() {
    //To PreventDouble Load in Iframes
    if (this.tab_id) { //Listen for Request to Get Alert Details
        GM_addValueChangeListener(alertRequestKey, (keyName, oldValue, newValue) => {
            // console.log('Alert request', newValue);
            getAlerts(newValue.id, GM_getValue(tokenChangedEvent), (alrts) => {
                // console.log('Alert Fetched', alrts);
                GM_setValue(alertResponseKey, {data: getTriggers(alrts), date: new Date()});
            })
        });

        //Add Auto Delete Confirmation Handler on all Delete Buttons
        $('.js-delete-btn').click(function () {
            waitClick('.js-delete');
        });

        setTimeout(investingBlackTheme, 1000);

        console.log("AlertCenter Listners Added")
    }
}

function equities() {
    //Wait For Alert Bell
    waitEE('.add-alert-bell-button', () => {
        captureToken();
    });
}

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {
    if (this.uid) {
        //Button to add alert Handler on Scrolled Pages (Improve find Better Way)
        buildArea(areaId).appendTo('body').append(
            buildButton(hookId, 'Hook', onHookClick)
        );

        //Listen to WatchList Changes
        GM_addValueChangeListener(
            tvWatchChangeEvent, (keyName, oldValue, newValue) => {
                //console.log (`Received new event: ${newValue}`);
                paintAlertFeed(newValue);
            });

        //Add AlertTicker Click Handler
        onHookClick();
    }
    //console.log("AlertFeed", this);
}

/**
 * Apply Black Theme to Site
 */
function investingBlackTheme() {
    //Alert Feed
    $('body').css('background-color', '#0f0f0f');
    $('span.alertDataDetails').css('color', 'white');
    $("div.alertWrapper").css('border', 'none');
    $('iframe').hide();

    //Alert List
    $("table.alertsTbl:first").css('color', 'white');
    $("div.floatingAlertWrapper").css("background-color","black");
}

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * @param tickers
 */
function paintAlertFeed(tickers, warn = false) {
    // console.log('Painting Alert Feed', tickers, trimmedNameMap);
    let watchSet = new Set(tickers.watch);
    let recentSet = new Set(tickers.recent);

    $("div.alertNotifData > a").each((i, e) => {
        let alertName = e.text;
        let ticker = getTickerFromAlertName(alertName);

        //Strip Exchange If Present
        ticker = ticker && ticker.includes(":") ? ticker.split(":")[1] : ticker;

        //Warn when Trimmed name missing in Name Map. Exclude Currencies
        if (warn && !ticker) {
            message(`Unable to Map: ${alertName}`.fontcolor('yellow'));
        }

        //Search Ticker and Color
        if (watchSet.has(ticker)) {
            $(e).css('color', 'orangered');
        } else if (recentSet.has(ticker)) {
            $(e).css('color', 'lime');
        } else {
            $(e).css('color', 'white');
        }
    });

    investingBlackTheme();
}

//Mappers
/**
 * Builds a Map of Investing Trimmed Name to TV Ticker
 */
function buildNameMap() {
    let nameTickerMapMem = {};

    //Load Pair Map with Investing Names
    let pairMap = GM_getValue(pairMapStore, {});
    //Load Investing to TV Ticker Map
    let investingToTVTickerMap = reverseMap(dataSiloInvesting.tickerMap);

    //Map Name to Ticker
    Object.keys(pairMap).forEach((investingTicker) => {
        //Trim Investing Name
        let trimmedName = trimInvestingName(pairMap[investingTicker].name);

        //Map to TV Ticker if Present
        let tvTicker = investingToTVTickerMap[investingTicker];

        //Map Trimmed Name to TV/Investing Ticker
        nameTickerMapMem[trimmedName] = tvTicker ? tvTicker : investingTicker;
    });

    return nameTickerMapMem;
}

function getTickerFromAlertName(alertName) {
    // First Try Direct Mapping
    let ticker = dataSiloInvesting.alertNameMap[alertName];

    //If Not Found in Trimmed Name Map. Try Direct Name Map
    if (!ticker) {
        //Map Trimmed Name to Ticker
        let trimmedName = trimInvestingName(alertName);
        ticker = trimmedNameMap[trimmedName];
    }
    return ticker;
}

function trimInvestingName(name) {
    return name.replace(' Ltd.', '').replace(' Ltd', '').trim().split(' ').slice(0, 2).join('+');
}

// Handlers

/**
 * Overrides Onclick of Alerts in Feed. Opens Ticker
 * @param e
 */
function onAlertClickHandler(e) {
    e.preventDefault();
    //console.log('Posting AlertTicker: ' + this.text);
    GM_setValue(alertClickedEvent, getTickerFromAlertName(this.text));
}

/**
 * Handler for Hook Button
 */
function onHookClick() {
    //Override OnClick for All Alerts
    $('.alertDataTitle').click(onAlertClickHandler);

    //Reload Silo & Data
    dataSiloInvesting = GM_getValue(dataSiloStore, {});
    let tvTickers = GM_getValue(tvWatchChangeEvent);
    trimmedNameMap = buildNameMap();

    //Paint Alert Feed With Current Watch List
    paintAlertFeed(tvTickers, true);
}

// ---------------------------- EQUITIES -------------------------------
/**
 * Overrides SetRequestHeader to Capture 'Token' Header
 */
function captureToken() {
    XMLHttpRequest.prototype.realSetRequest = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
        if (k === 'token') {
            GM_setValue(tokenChangedEvent, v);
            message('Token Captured'.fontcolor('yellow'));
        }
        this.realSetRequest(k, v);
    };
}