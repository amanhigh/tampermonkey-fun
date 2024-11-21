/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 * @class KohanClient
 * @extends {BaseClient}
 */
class KohanClient extends BaseClient {
    /**
     * Creates an instance of KohanClient
     * @param {string} [baseUrl='http://localhost:9010/v1'] - Base URL for Kohan API
     */
    constructor(baseUrl = 'http://localhost:9010/v1') {
        super(baseUrl);
    }

    /**
     * Record a ticker via the API
     * @param {string} ticker - Ticker symbol to record
     * @returns {Promise<Object>} Response from the API
     * @throws {Error} When recording ticker fails
     */
    async recordTicker(ticker) {
        try {
            const response = await this._makeRequest(`/ticker/${ticker}/record`);
            message(`Request Successful: ${this._getBaseUrl()}/ticker/${ticker}/record`.fontcolor('green'));
            return response;
        } catch (error) {
            throw new Error(`Failed to record ticker: ${error.message}`);
        }
    }

    /**
     * Retrieve clipboard data from the API
     * @returns {Promise<Object>} Promise resolving with clipboard data
     * @throws {Error} When retrieving clipboard data fails
     */
    async getClip() {
        try {
            return await this._makeRequest('/clip');
        } catch (error) {
            throw new Error(`Failed to get clip: ${error.message}`);
        }
    }
}