/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
class KohanClient {
    /**
     * Create a new KohanClient instance
     * @param {string} [baseUrl='http://localhost:9010/v1'] - Base URL for API requests
     */
    constructor(baseUrl = 'http://localhost:9010/v1') {
        this.baseUrl = baseUrl;
    }

    /**
     * Make a generic HTTP request using GM.xmlHttpRequest
     * @private
     * @param {Object} options - Request configuration
     * @returns {Promise} Promise resolving with response data
     */
    _makeRequest(options) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    ...options.headers
                },
                url: options.url,
                method: options.method || 'GET',
                onload: (response) => {
                    if (response.status >= 200 && response.status < 400) {
                        try {
                            const data = response.responseText ? JSON.parse(response.responseText) : null;
                            resolve(data);
                            message(`Request Successful: ${options.url}`.fontcolor('green'));
                        } catch (parseError) {
                            reject(new Error(`Failed to parse response: ${parseError.message}`));
                        }
                    } else {
                        reject(new Error(`Request failed: (${response.status} ${response.statusText}) ${response.responseText}`));
                    }
                },
                onerror: (error) => {
                    reject(new Error(`Network error: ${error.statusText}`));
                }
            });
        });
    }

    /**
     * Record a ticker via the API
     * @param {string} ticker - Ticker symbol to record
     * @returns {Promise<void>} Promise resolving when ticker is recorded
     */
    recordTicker(ticker) {
        return this._makeRequest({
            url: `${this.baseUrl}/ticker/${ticker}/record`
        });
    }

    /**
     * Retrieve clipboard data from the API
     * @returns {Promise<Object>} Promise resolving with clipboard data
     */
    getClip() {
        return this._makeRequest({
            url: `${this.baseUrl}/clip`
        });
    }
}