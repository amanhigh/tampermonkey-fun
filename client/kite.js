/* Kite Client for Zerodha GTT (Good Till Triggered) Operations */
function KiteClient(baseUrl = 'https://kite.zerodha.com/oms/gtt') {
    /**
     * Get authorization token from local storage
     * @private
     * @returns {string} Encoded authentication token
     */
    this._getAuthToken = function() {
        return JSON.parse(localStorage.getItem("__storejs_kite_enctoken"));
    };

    /**
     * Prepare standard headers for Kite API requests
     * @private
     * @returns {Object} Headers for API requests
     */
    this._getHeaders = function() {
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + this._getAuthToken()
        };
    };

    /**
     * Make a generic HTTP request using GM.xmlHttpRequest
     * @private
     * @param {Object} options - Request configuration
     * @param {Function} successCallback - Callback on successful request
     * @param {Function} errorCallback - Callback on request error
     */
    this._makeRequest = function(options, successCallback, errorCallback) {
        GM.xmlHttpRequest({
            headers: {
                ...this._getHeaders(),
                ...options.headers
            },
            url: options.url,
            method: options.method,
            data: options.data,
            onload: function(response) {
                if (response.status >= 200 && response.status < 400) {
                    try {
                        const data = response.responseText ? JSON.parse(response.responseText) : null;
                        successCallback(data);
                    } catch (parseError) {
                        errorCallback(`Failed to parse response: ${parseError.message}`);
                    }
                } else {
                    errorCallback(`Request failed: (${response.status} ${response.statusText}) ${response.responseText}`);
                }
            },
            onerror: function(error) {
                errorCallback(`Network error: ${error.statusText}`);
            }
        });
    };

    /**
     * Create a new Good Till Triggered (GTT) order
     * @param {Object} body - GTT order details
     */
    this.createGTT = function(body) {
        this._makeRequest(
            {
                url: `${baseUrl}/triggers`,
                method: "POST",
                data: body
            },
            () => {
                // Silently log success, matching original implementation
                console.log('GTT Created');
            },
            (error) => {
                alert(`Error Creating GTT: ${error}`);
            }
        );
    };

    /**
     * Load existing Good Till Triggered (GTT) orders
     * @param {Function} callback - Callback to handle retrieved GTT orders
     */
    this.loadGTT = function(callback) {
        this._makeRequest(
            {
                url: `${baseUrl}/triggers`,
                method: "GET"
            },
            (data) => {
                callback(data);
            },
            (error) => {
                alert(`Error Fetching GTT: ${error}`);
            }
        );
    };

    /**
     * Delete a specific Good Till Triggered (GTT) order
     * @param {string} id - ID of the GTT order to delete
     */
    this.deleteGTT = function(id) {
        this._makeRequest(
            {
                url: `${baseUrl}/triggers/${id}`,
                method: "DELETE",
                headers: {
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
                }
            },
            () => {
                message(`Trigger Deleted -> ${id}`.fontcolor('green'));
            },
            (error) => {
                alert(`Error Deleting Trigger: ${error}`);
            }
        );
    };
}