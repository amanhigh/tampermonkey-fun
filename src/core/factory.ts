import { InvestingClient, IInvestingClient } from '../client/investing';
import { KiteClient, IKiteClient } from '../client/kite';
import { KohanClient, IKohanClient } from '../client/kohan';
import { UIUtil, IUIUtil } from '../util/ui';
import { ObserveUtil, IObserveUtil } from '../util/observer';
import { SearchUtil, ISearchUtil } from '../util/search';
import { SyncUtil, ISyncUtil } from '../util/sync';
import { KeyUtil, IKeyUtil } from '../util/key';
import { SmartPrompt, ISmartPrompt } from '../util/smart';
import { WaitUtil, IWaitUtil } from '../util/wait';
import { TestApp } from './test';

// Repository Imports
import { RepoCron, IRepoCron } from '../repo/cron';
import { IFlagRepo, FlagRepo } from '../repo/flag';
import { IOrderRepo, OrderRepo } from '../repo/order';
import { IPairRepo, PairRepo } from '../repo/pair';
import { IExchangeRepo, ExchangeRepo } from '../repo/exchange';
import { ITickerRepo, TickerRepo } from '../repo/ticker';
import { ISequenceRepo, SequenceRepo } from '../repo/sequence';
import { IAuditRepo, AuditRepo } from '../repo/audit';
import { IRecentTickerRepo, RecentTickerRepo } from '../repo/recent';
import { IAlertRepo, AlertRepo } from '../repo/alert';

/**
 * Project Architecture Overview
 * ----------------------------
 * Greasemonkey Script Architecture
 * Note: Due to Greasemonkey script constraints, ES6 modules (import/export) are not supported.
 * All code must be in global scope with proper namespacing through classes and factory pattern.
 */
export class Factory {
    /**
     * Instance cache for singletons
     * @private
     */
    private static _instances: Record<string, unknown> = {};

    /**
     * Application Layer
     * Core application functionality
     */
    public static app = {
        test: (): TestApp => 
            Factory._getInstance('testApp', () => new TestApp(Factory.util.ui(), Factory.util.key())),
    };

    /**
     * Client Layer
     * Handles external API interactions
     */
    public static client = {
        investing: (): IInvestingClient => 
            Factory._getInstance('investingClient', () => new InvestingClient()),
        kite: (): IKiteClient => 
            Factory._getInstance('kiteClient', () => new KiteClient()),
        kohan: (): IKohanClient => 
            Factory._getInstance('kohanClient', () => new KohanClient()),
    };

    /**
     * Utility Layer
     * Handles utility operations and management
     */
    public static util = {
        dom: (): IWaitUtil =>
            Factory._getInstance('waitUtil', () => new WaitUtil()),
        observer: (): IObserveUtil =>
            Factory._getInstance('observeUtil', () => new ObserveUtil()),
        search: (): ISearchUtil =>
            Factory._getInstance('searchUtil', () => new SearchUtil()),
        sync: (): ISyncUtil =>
            Factory._getInstance('syncUtil', () => new SyncUtil()),
        key: (): IKeyUtil =>
            Factory._getInstance('keyUtil', () => new KeyUtil(Factory.util.sync())),
        smart: (): ISmartPrompt =>
            Factory._getInstance('smartPrompt', () => new SmartPrompt()),
        ui: (): IUIUtil =>
            Factory._getInstance('uiUtil', () => new UIUtil()),
    };

    /**
     * Repository Layer
     * Handles data persistence for various entities
     */
    public static repo = {
        /**
         * Get RepoCron singleton instance
         * @private
         */
        _cron: (): IRepoCron =>
            Factory._getInstance('repoCron', () => new RepoCron()),

        /**
         * Category-based Repositories
         */
        flag: (): IFlagRepo =>
            Factory._getInstance('flagRepo', () => new FlagRepo(Factory.repo._cron())),

        order: (): IOrderRepo =>
            Factory._getInstance('orderRepo', () => new OrderRepo(Factory.repo._cron())),

        /**
         * Map-based Repositories
         */
        alert: (): IAlertRepo =>
            Factory._getInstance('alertRepo', () => new AlertRepo(Factory.repo._cron())),
        
        pair: (): IPairRepo =>
            Factory._getInstance('pairRepo', () => new PairRepo(Factory.repo._cron())),

        exchange: (): IExchangeRepo =>
            Factory._getInstance('exchangeRepo', () => new ExchangeRepo(Factory.repo._cron())),

        ticker: (): ITickerRepo =>
            Factory._getInstance('tickerRepo', () => new TickerRepo(Factory.repo._cron())),

        sequence: (): ISequenceRepo =>
            Factory._getInstance('sequenceRepo', () => new SequenceRepo(Factory.repo._cron())),

        audit: (): IAuditRepo =>
            Factory._getInstance('auditRepo', () => new AuditRepo(Factory.repo._cron())),

        /**
         * Set-based Repositories
         */
        recent: (): IRecentTickerRepo =>
            Factory._getInstance('recentRepo', () => new RecentTickerRepo(Factory.repo._cron())),
    };

    /**
     * Manager Layer
     * Handles business logic and orchestration
     * TODO: Implement manager layer
     */
    public static manager = {
        // To be implemented later
    };

    /**
     * Creates or retrieves a singleton instance
     * @private
     * @param key - Instance identifier
     * @param creator - Factory function
     * @returns Instance of type T
     */
    private static _getInstance<T>(key: string, creator: () => T): T {
        if (!this._instances[key]) {
            try {
                this._instances[key] = creator();
            } catch (error) {
                console.error(`Error creating instance for ${key}:`, error);
                throw error;
            }
        }
        return this._instances[key] as T;
    }
}
