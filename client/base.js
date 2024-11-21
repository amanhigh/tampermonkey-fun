/**
 * Base client with common HTTP functionality for making API requests
 * Provides common request handling, error management, and response parsing
 * @class BaseClient
 */
class BaseClient {
    /**
     * Base URL for API requests
     * @private
     * @type {string}
     */
    _baseUrl;

    /**
     * Creates an instance of BaseClient
     * @param {string} baseUrl - Base URL for API requests
     */
    constructor(baseUrl) {
        this._baseUrl = baseUrl;
    }

    /**
     * Get the base URL
     * @protected
     * @returns {string} Base URL for API requests
     */
    _getBaseUrl() {
        return this._baseUrl;
    }

    /**
     * Makes an HTTP request using GM.xmlHttpRequest
     * Handles response parsing and error management
     * @protected
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request configuration
     * @param {string} [options.method] - HTTP method
     * @param {Object} [options.headers] - Additional headers
     * @param {string} [options.data] - Request body data
     * @returns {Promise<any>} Promise resolving with response data
     * @throws {Error} When request fails or response parsing fails
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