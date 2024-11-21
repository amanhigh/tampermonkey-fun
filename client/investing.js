/**
 * Client for interacting with Investing.com API
 */
class InvestingClient extends BaseClient {
    constructor(baseUrl = "https://in.investing.com") {
        super(baseUrl);
    }

    /**
     * Creates a new price alert
     * @param {string} name - Symbol name
     * @param {string} pairId - Pair ID from Investing.com
     * @param {number} price - Target price for the alert
     * @param {number} ltp - Last Traded Price
     * @returns {Promise<Object>} Alert creation result
     */
    async createAlert(name, pairId, price, ltp) {
        const threshold = price > ltp ? 'over' : 'under';
        
        const data = new URLSearchParams({
            alertType: 'instrument',
            'alertParams[alert_trigger]': 'price',
            'alertParams[pair_ID]': pairId,
            'alertParams[threshold]': threshold,
            'alertParams[frequency]': 'Once',
            'alertParams[value]': price,
            'alertParams[platform]': 'desktopAlertsCenter',
            'alertParams[email_alert]': 'Yes'
        });

        try {
            await this._makeRequest('/useralerts/service/create', {
                method: 'POST',
                data: data.toString()
            });
            return { name, pairId, price };
        } catch (error) {
            throw new Error(`Failed to create alert: ${error.message}`);
        }
    }

    /**
     * Deletes an existing alert
     * @param {Alert} alert - Alert object to delete
     * @returns {Promise<Alert>} Deleted alert object
     */
    async deleteAlert(alert) {
        const data = new URLSearchParams({
            alertType: 'instrument',
            'alertParams[alert_ID]': alert.Id,
            'alertParams[platform]': 'desktop'
        });

        try {
            await this._makeRequest('/useralerts/service/delete', {
                method: 'POST',
                data: data.toString()
            });
            return alert;
        } catch (error) {
            throw new Error(`Failed to delete alert: ${error.message}`);
        }
    }

    /**
     * Fetch symbol data from the investing.com API
     * @param {string} symbol - the symbol to search for
     * @returns {Promise<Array<PairInfo>>} - Promise resolving to an array of PairInfo objects
     */
    async fetchSymbolData(symbol) {
        const data = new URLSearchParams({
            search_text: symbol,
            term: symbol,
            country_id: '0',
            tab_id: 'All'
        });

        try {
            const response = await this._makeRequest('/search/service/search?searchType=alertCenterInstruments', {
                method: 'POST',
                data: data.toString()
            });
            
            const result = JSON.parse(response);
            if (!result.All?.length) {
                throw new Error(`No results found for symbol: ${symbol}`);
            }
            
            return result.All.map(item => 
                new PairInfo(item.name, item.pair_ID, item.exchange_name_short)
            );
        } catch (error) {
            throw new Error(`Failed to fetch symbol data: ${error.message}`);
        }
    }

    /**
     * Fetch all Alerts for all Pairs
     * @returns {Promise<string>} Raw response containing all alerts
     */
    async getAllAlerts() {
        try {
            return await this._makeRequest('/members-admin/alert-center', {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(`Failed to get alerts: ${error.message}`);
        }
    }
}