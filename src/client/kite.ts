import { BaseClient, IBaseClient } from './base';

interface GTTOrderDetails {
    [key: string]: any;  // TODO: Define specific GTT order structure when available
}

interface GTTResponse {
    [key: string]: any;  // TODO: Define specific GTT response structure when available
}

/**
 * Client for Zerodha GTT (Good Till Triggered) Operations
 * Handles GTT order creation, deletion, and retrieval
 */
export interface IKiteClient extends IBaseClient {
    /**
     * Create a new Good Till Triggered (GTT) order
     * @param body - GTT order details
     * @throws Error when GTT creation fails
     */
    createGTT(body: GTTOrderDetails): Promise<void>;

    /**
     * Load existing Good Till Triggered (GTT) orders
     * @param callback - Callback to handle retrieved GTT orders
     * @throws Error when fetching GTT fails
     */
    loadGTT(callback: (data: GTTResponse) => void): Promise<void>;

    /**
     * Delete a specific Good Till Triggered (GTT) order
     * @param id - ID of the GTT order to delete
     * @throws Error when GTT deletion fails
     */
    deleteGTT(id: string): Promise<void>;
}

/**
 * Client for Zerodha GTT (Good Till Triggered) Operations
 * Handles GTT order creation, deletion, and retrieval
 */
export class KiteClient extends BaseClient implements IKiteClient {
    /**
     * Creates an instance of KiteClient
     * @param baseUrl - Base URL for Kite API
     */
    constructor(baseUrl: string = 'https://kite.zerodha.com/oms/gtt') {
        super(baseUrl);
    }

    /**
     * Get authorization token from local storage
     * @returns Encoded authentication token
     * @throws Error when token is not found in localStorage
     */
    private _getAuthToken(): string {
        const token = localStorage.getItem("__storejs_kite_enctoken");
        if (!token) {
            throw new Error("Auth token not found in localStorage");
        }
        return JSON.parse(token);
    }

    /**
     * Prepare standard headers for Kite API requests
     * @returns Headers for API requests
     */
    private _getDefaultHeaders(): Record<string, string> {
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
     * @param body - GTT order details
     * @throws Error when GTT creation fails
     */
    async createGTT(body: GTTOrderDetails): Promise<void> {
        try {
            await this.makeRequest('/triggers', {
                method: 'POST',
                data: body,
                headers: this._getDefaultHeaders()
            });
            console.log('GTT Created');
        } catch (error) {
            throw new Error(`Error Creating GTT: ${(error as Error).message}`);
        }
    }

    /**
     * Load existing Good Till Triggered (GTT) orders
     * @param callback - Callback to handle retrieved GTT orders
     * @throws Error when fetching GTT fails
     */
    async loadGTT(callback: (data: GTTResponse) => void): Promise<void> {
        try {
            const data = await this.makeRequest<GTTResponse>('/triggers', {
                method: 'GET',
                headers: this._getDefaultHeaders()
            });
            callback(data);
        } catch (error) {
            throw new Error(`Error Fetching GTT: ${(error as Error).message}`);
        }
    }

    /**
     * Delete a specific Good Till Triggered (GTT) order
     * @param id - ID of the GTT order to delete
     * @throws Error when GTT deletion fails
     */
    async deleteGTT(id: string): Promise<void> {
        try {
            await this.makeRequest(`/triggers/${id}`, {
                method: 'DELETE',
                headers: {
                    ...this._getDefaultHeaders(),
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache"
                }
            });
        } catch (error) {
            throw new Error(`Error Deleting Trigger: ${(error as Error).message}`);
        }
    }
}
