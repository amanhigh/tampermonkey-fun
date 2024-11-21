/**
 * Client for Zerodha GTT (Good Till Triggered) Operations
 * Handles GTT order creation, deletion, and retrieval
 * @class KiteClient
 * @extends {BaseClient}
 */
class KiteClient extends BaseClient {
    /**
     * Creates an instance of KiteClient
     * @param {string} [baseUrl='https://kite.zerodha.com/oms/gtt'] - Base URL for Kite API
     */
    constructor(baseUrl = 'https://kite.zerodha.com/oms/gtt') {
        super(baseUrl);
    }

    /**
     * Get authorization token from local storage
     * @private
     * @returns {string} Encoded authentication token
     */
    _getAuthToken() {
        return JSON.parse(localStorage.getItem("__storejs_kite_enctoken"));
    }

    /**
     * Prepare standard headers for Kite API requests
     * @private
     * @returns {Object} Headers for API requests
     */
    _getDefaultHeaders() {
        return {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + this._getAuthToken()
        };
    }

    /**
     * Create a new Good Till Triggered (GTT) order
     * @param {Object} body - GTT order details
     * @throws {Error} When GTT creation fails
     */
    async createGTT(body) {
        try {
            await this._makeRequest('/triggers', {
                method: 'POST',
                data: body,
                headers: this._getDefaultHeaders()
            });
            console.log('GTT Created');
        } catch (error) {
            throw new Error(`Error Creating GTT: ${error.message}`);
        }
    }

    /**
     * Load existing Good Till Triggered (GTT) orders
     * @param {Function} callback - Callback to handle retrieved GTT orders
     * @throws {Error} When fetching GTT fails
     */
    async loadGTT(callback) {
        try {
            const data = await this._makeRequest('/triggers', {
                method: 'GET',
                headers: this._getDefaultHeaders()
            });
            callback(data);
        } catch (error) {
            throw new Error(`Error Fetching GTT: ${error.message}`);
        }
    }

    /**
     * Delete a specific Good Till Triggered (GTT) order
     * @param {string} id - ID of the GTT order to delete
     * @throws {Error} When GTT deletion fails
     */
    async deleteGTT(id) {
        try {
            await this._makeRequest(`/triggers/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this._getDefaultHeaders(),
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
                }
            });
            message(`Trigger Deleted -> ${id}`.fontcolor('green'));
        } catch (error) {
            throw new Error(`Error Deleting Trigger: ${error.message}`);
        }
    }
}