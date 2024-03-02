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
const orderQtySelector = 'div[class^=units] input';
const orderInputSelector = 'span[class^=group] input';

//Text Box
const closeTextboxSelector = 'button:contains("Ok")';
const reasons = ['dep', 'ooa', 'tiz', 'oe', 'tto'];

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

//Stores
const dataSiloStore = 'dataSilo';
const orderInfoStore = 'orderInfo';
const flagInfoStore = 'flagInfo';

//Events/Signals
const gttRequest = "gttRequest";

//UI Ids
const swiftId = 'aman-swift';
const summaryId = 'aman-summary';
const inputId = 'aman-input';
const priceId = 'aman-price';
const gttId = 'aman-gtt';
const refreshId = 'aman-refresh';
const recentId = 'aman-recent';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';
const trelloId = 'aman-trello';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'];
const fnoCss = {
    'border-top-style': 'groove',
    'border-width': 'medium'
};
const NSE_EXCHANGE = "NSE";

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
const timeFrameBar = {
    "DEFAULT": [6, 5, 4, 3],
    "NSE": [6, 5, 4, 3],
    "SCALP": [7, 6, 5, 4]
}
