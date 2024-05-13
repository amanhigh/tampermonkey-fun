/** Selectors **/
//Top Header
const headerSelector = '#header-toolbar-symbol-search';
const tickerSelector = `${headerSelector} > div`;
const saveSelector = '#header-toolbar-save-load';
const symbolFlagSelector = 'div[class*=flagWrapper]';
const timeframeSelector = `#header-toolbar-intervals > div[class*=group] > button`;

//Name, Exchange, Prices
const nameSelector = 'div[class*=mainTitle]';
const exchangeSelector = 'div[class*=exchangeTitle]';

//Popups
const searchPopupSelector = 'input[class^=search]';
const replayActiveSelector = '#header-toolbar-replay[class*=isActive]';
const replayPlayPauseSelector = 'div[class*=replayToolbar] span[class*=icon]:nth(1)'
const autoAlertSelector = "span:contains(\'Copy price\')"

//Order Panel
const orderPanelCloseSelector = 'div[data-name=button-close]';
const orderRiskLimit = 1600;

//Text Box
const closeTextboxSelector = 'button:contains("Ok")';
const reasons = ['dep', 'ooa', 'tiz', 'oe', 'tto', 'nca', 'tested', 'zn', 'max', 'base', 'er', 'nzn', 'nsprt', 'REC', 'WOW'];
const overrides = ['egf', 'int', 'lc', 'loc', 'doji', 'big', 'pn', 'tc', 'cfl', 'acm', 'adv'];

//Watchlist Hidden Description Box
const ltpSelector = 'span[class^=priceWrapper] > span:first';

//Screener
const screenerSelector = "tbody.tv-data-table__tbody:nth(1)";
const screenerLineSelector = `tr.tv-screener-table__result-row`;
const screenerSymbolSelector = '.tv-screener__symbol';
const screenerSelectedSelector = '.tv-screener-table__result-row--selected';
const screenerButtonSelector = 'button[data-name=toggle-visibility-button]';

//Watchlist
const watchListWidgetSelector = 'div.widgetbar-widgetbody:first';
const watchListSelector = `div[class^=listContainer]`;
const watchListItemSelector = `div[class*=symbol-]`;
const watchListLineSelector = `${watchListSelector} > div > div`;
const watchListSymbolSelector = 'span[class*=symbolNameText]';
const watchListSelectedSelector = 'div[class*=selected]';
const flagSelector = "div[class^=uiMarker]";
const flagMarkingSelector = `${flagSelector} > svg > path:nth(0)`;

//Toolbars
let toolbarSelector = 'span.tv-favorited-drawings-toolbar__widget'
let styleSelector = 'div.floating-toolbar-react-widgets__button';
let styleItemSelector = `span[class^=label]`;

//Sidebar
const deleteArrowSelector = 'div [data-name="removeAllDrawingTools"] button[class^=arrow]';
const deleteDrawingSelector = 'div [data-name="remove-drawing-tools"]';

// -- Silos
const dataSiloStore = 'dataSilo'; // Data Silo
const orderInfoStore = 'orderSilo'; // Ticker Lists
const flagInfoStore = 'flagSilo'; // Ticker Flag Lists
const pairMapStore = "pairSilo"; // Investing Ticker to PairId, Investing Name Map

// -- Events/Signals
// TODO: Create Event models (Currently Generic Maps). Eg. gttOrderEvent
const gttOrderEvent = "gttOrderEvent" //GTT Order List
const tvWatchChangeEvent = "tvWatchChangeEvent"; //Update of TV WatchList
const alertClickedEvent = "alertClickedEvent"; //Alert Clicked in Feed

// -- Request/Response
const gttRequest = "gttRequest";

// -- UI
// Check Box
const swiftId = 'aman-swift';
const recentId = 'aman-recent';

// Inputs
const inputId = 'aman-input';
const priceId = 'aman-price';

// Buttons
const seqId = 'aman-seq';
const refreshBtnId = 'aman-refresh';
const altCreateBtnId = 'aman-alert-create';
const journalBtnId = 'aman-journal-btn';

// Areas
const summaryId = 'aman-summary';
const topId = 'aman-top';
const midId = 'aman-mid';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';
const journalId = 'aman-journal';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'];
const fnoCss = {
    'border-top-style': 'groove',
    'border-width': 'medium'
};
const fnoSymbols = new Set(
    ['AARTIIND', 'ABB', 'ABBOTINDIA', 'ABCAPITAL', 'ABFRL', 'ACC', 'ADANIENT', 'ADANIPORTS', 'ALKEM', 'AMBUJACEM', 'APOLLOHOSP', 'APOLLOTYRE', 'ASHOKLEY', 'ASIANPAINT', 'ASTRAL', 'ATUL', 'AUBANK', 'AUROPHARMA', 'AXISBANK', 'BAJAJ_AUTO', 'BAJAJFINSV', 'BAJFINANCE', 'BALKRISIND', 'BALRAMCHIN', 'BANDHANBNK', 'BANKBARODA', 'BATAINDIA', 'BEL', 'BERGEPAINT', 'BHARATFORG', 'BHARTIARTL', 'BHEL', 'BIOCON', 'BOSCHLTD', 'BPCL', 'BRITANNIA', 'BSOFT', 'CANBK', 'CANFINHOME', 'CHAMBLFERT', 'CHOLAFIN', 'CIPLA', 'COALINDIA', 'COFORGE', 'COLPAL', 'CONCOR', 'COROMANDEL', 'CROMPTON', 'CUB', 'CUMMINSIND', 'DABUR', 'DALBHARAT', 'DEEPAKNTR', 'DELTACORP', 'DIVISLAB', 'DIXON', 'DLF', 'DRREDDY', 'EICHERMOT', 'ESCORTS', 'EXIDEIND', 'FEDERALBNK', 'FSL', 'GAIL', 'GLENMARK', 'GMRINFRA', 'GNFC', 'GODREJCP', 'GODREJPROP', 'GRANULES', 'GRASIM', 'GUJGASLTD', 'HAL', 'HAVELLS', 'HCLTECH', 'HDFC', 'HDFCAMC', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO', 'HINDCOPPER', 'HINDPETRO', 'HINDUNILVR', 'HONAUT', 'IBULHSGFIN', 'ICICIBANK', 'ICICIGI', 'ICICIPRULI', 'IDEA', 'IDFC', 'IDFCFIRSTB', 'IEX', 'IGL', 'INDHOTEL', 'INDIACEM', 'INDIAMART', 'INDIGO', 'INDUSINDBK', 'INDUSTOWER', 'INFY', 'INTELLECT', 'IOC', 'IPCALAB', 'IRCTC', 'ITC', 'JINDALSTEL', 'JKCEMENT', 'JSWSTEEL', 'JUBLFOOD', 'KOTAKBANK', 'L_TFH', 'LALPATHLAB', 'LAURUSLABS', 'LICHSGFIN', 'LT', 'LTI', 'LTIM', 'LTTS', 'LUPIN', 'M_M', 'M_MFIN', 'MANAPPURAM', 'MARICO', 'MARUTI', 'MCDOWELL_N', 'MCX', 'METROPOLIS', 'MFSL', 'MGL', 'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM', 'NAUKRI', 'NAVINFLUOR', 'NESTLEIND', 'NMDC', 'NTPC', 'OBEROIRLTY', 'OFSS', 'ONGC', 'PAGEIND', 'PEL', 'PERSISTENT', 'PETRONET', 'PFC', 'PIDILITIND', 'PIIND', 'PNB', 'POLYCAB', 'POWERGRID', 'PVR', 'RAIN', 'RAMCOCEM', 'RBLBANK', 'RECLTD', 'RELIANCE', 'SAIL', 'SBICARD', 'SBILIFE', 'SBIN', 'SHREECEM', 'SHRIRAMFIN', 'SIEMENS', 'SRF', 'SRTRANSFIN', 'SUNPHARMA', 'SUNTV', 'SYNGENE', 'TATACHEM', 'TATACOMM', 'TATACONSUM', 'TATAMOTORS', 'TATAPOWER', 'TATASTEEL', 'TCS', 'TECHM', 'TITAN', 'TORNTPHARM', 'TORNTPOWER', 'TRENT', 'TVSMOTOR', 'UBL', 'ULTRACEMCO', 'UPL', 'VEDL', 'VOLTAS', 'WHIRLPOOL', 'WIPRO', 'ZEEL', 'ZYDUSLIFE']);
const NSE_EXCHANGE = "NSE";

const DEFAULT_SEQUENCE = "MWD";
const HIGH_SEQUENCE = "YR";

//Style
const styleMap = {
    3: "I",
    4: "H",
    5: "VH",
    6: "T",
    7: "I"
}

const timeframeMap = {
    3: "D",
    4: "WK",
    5: "MN",
    6: "TMN",
    7: "SMN"
}

// Constants VHTF,HTF,ITF,TTF
// HACK: Convert to ENUM
const timeFrameBar = {
    "MWD": [6, 5, 4, 3],
    "YR": [7, 6, 5, 4]
}

const ENTER_KEY_CODE = 13;