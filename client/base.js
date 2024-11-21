/**
 * Base client with common HTTP functionality
 */
class BaseClient {
    /**
     * Base URL for API requests
     * @private
     */
    _baseUrl;

    /**
     * @param {string} baseUrl - Base URL for API requests
     */
    constructor(baseUrl) {
        this._baseUrl = baseUrl;
    }

    /**
     * Get the base URL
     * @protected
     * @returns {string} Base URL
     */
    _getBaseUrl() {
        return this._baseUrl;
    }

    /**
     * Makes an HTTP request
     * @protected
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} API response
     */
    async _makeRequest(endpoint, options = {}) {
        const headers = {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            ...options.headers
        };

        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                ...options,
                headers,
                url: `${this._baseUrl}${endpoint}`,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 400) {
                        try {
                            const data = response.responseText ? JSON.parse(response.responseText) : null;
                            resolve(data);
                        } catch (error) {
                            reject(new Error(`Failed to parse response: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`${response.status} ${response.statusText}: ${response.responseText}`));
                    }
                },
                onerror: (error) => reject(new Error(`Network error: ${error.statusText}`))
            });
        });
    }
}