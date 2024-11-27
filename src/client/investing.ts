import { Alert, PairInfo } from '../models/alert';
import { BaseClient } from './base';



/**
 * Client for interacting with Investing.com API
 */
export class InvestingClient extends BaseClient {
    constructor(baseUrl: string = "https://in.investing.com") {
        super(baseUrl);
    }

    /**
     * Creates a new price alert
     */
    async createAlert(name: string, pairId: string, price: number, ltp: number): Promise<{
        name: string;
        pairId: string;
        price: number;
    }> {
        const threshold = price > ltp ? 'over' : 'under';
        
        const data = new URLSearchParams({
            alertType: 'instrument',
            'alertParams[alert_trigger]': 'price',
            'alertParams[pair_ID]': pairId,
            'alertParams[threshold]': threshold,
            'alertParams[frequency]': 'Once',
            'alertParams[value]': price.toString(),
            'alertParams[platform]': 'desktopAlertsCenter',
            'alertParams[email_alert]': 'Yes'
        });

        try {
            await this.makeRequest('/useralerts/service/create', {
                method: 'POST',
                data: data.toString()
            });
            return { name, pairId, price };
        } catch (error) {
            throw new Error(`Failed to create alert: ${(error as Error).message}`);
        }
    }

    /**
     * Deletes an existing alert
     */
    async deleteAlert(alert: Alert): Promise<Alert> {
        const data = new URLSearchParams({
            alertType: 'instrument',
            'alertParams[alert_ID]': alert.id,
            'alertParams[platform]': 'desktop'
        });

        try {
            await this.makeRequest('/useralerts/service/delete', {
                method: 'POST',
                data: data.toString()
            });
            return alert;
        } catch (error) {
            throw new Error(`Failed to delete alert: ${(error as Error).message}`);
        }
    }

    /**
     * Fetch symbol data from the investing.com API
     */
    async fetchSymbolData(symbol: string): Promise<PairInfo[]> {
        const data = new URLSearchParams({
            search_text: symbol,
            term: symbol,
            country_id: '0',
            tab_id: 'All'
        });

        try {
            const response = await this.makeRequest<string>('/search/service/search?searchType=alertCenterInstruments', {
                method: 'POST',
                data: data.toString()
            });
            
            const result = JSON.parse(response);
            if (!result.All?.length) {
                throw new Error(`No results found for symbol: ${symbol}`);
            }
            
            return result.All.map((item: any) => 
                new PairInfo(
                    item.name,
                    item.pair_ID,
                    item.exchange_name_short
                )
            );
        } catch (error) {
            throw new Error(`Failed to fetch symbol data: ${(error as Error).message}`);
        }
    }

    /**
     * Fetch all Alerts for all Pairs
     */
    async getAllAlerts(): Promise<string> {
        try {
            return await this.makeRequest('/members-admin/alert-center', {
                method: 'GET'
            });
        } catch (error) {
            throw new Error(`Failed to get alerts: ${(error as Error).message}`);
        }
    }
}