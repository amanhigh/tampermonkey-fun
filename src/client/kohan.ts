import { BaseClient, IBaseClient } from './base';

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
export interface IKohanClient extends IBaseClient {
    /**
     * Record a ticker via the API
     * @param ticker - Ticker symbol to record
     * @returns Promise resolving with the API response
     * @throws Error when recording ticker fails
     */
    recordTicker(ticker: string): Promise<void>;

    /**
     * Retrieve clipboard data from the API
     * @returns Promise resolving with clipboard data
     * @throws Error when retrieving clipboard data fails
     */
    getClip(): Promise<string>;
}

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
export class KohanClient extends BaseClient implements IKohanClient {
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
    async recordTicker(ticker: string): Promise<void> {
        try {
            await this.makeRequest<void>(`/ticker/${ticker}/record`);
        } catch (error) {
            throw new Error(`Failed to record ticker: ${(error as Error).message}`);
        }
    }

    /**
     * Retrieve clipboard data from the API
     * @returns Promise resolving with clipboard data
     * @throws Error when retrieving clipboard data fails
     */
    async getClip(): Promise<string> {
        try {
            return await this.makeRequest<string>('/clip');
        } catch (error) {
            throw new Error(`Failed to get clip: ${(error as Error).message}`);
        }
    }
}
