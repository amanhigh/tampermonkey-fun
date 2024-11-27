import { BaseClient } from './base';

interface KohanResponse {
    [key: string]: any;  // TODO: Define specific response structure when available
}

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
export class KohanClient extends BaseClient {
    /**
     * Creates an instance of KohanClient
     * @param baseUrl - Base URL for Kohan API
     */
    constructor(baseUrl: string = 'http://localhost:9010/v1') {
        super(baseUrl);
    }

    /**
     * Record a ticker via the API
     * @param ticker - Ticker symbol to record
     * @returns Promise resolving with the API response
     * @throws Error when recording ticker fails
     */
    async recordTicker(ticker: string): Promise<KohanResponse> {
        try {
            const response = await this.makeRequest<KohanResponse>(`/ticker/${ticker}/record`);
            return response;
        } catch (error) {
            throw new Error(`Failed to record ticker: ${(error as Error).message}`);
        }
    }

    /**
     * Retrieve clipboard data from the API
     * @returns Promise resolving with clipboard data
     * @throws Error when retrieving clipboard data fails
     */
    async getClip(): Promise<KohanResponse> {
        try {
            return await this.makeRequest<KohanResponse>('/clip');
        } catch (error) {
            throw new Error(`Failed to get clip: ${(error as Error).message}`);
        }
    }
}
