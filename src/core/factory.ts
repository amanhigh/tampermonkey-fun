import { InvestingClient } from '../client/investing';
import { KiteClient } from '../client/kite';
import { KohanClient } from '../client/kohan';
import { UIUtil } from '../util/ui';
import { ObserveUtil } from '../util/observer';
import { SearchUtil } from '../util/search';
import { SyncUtil } from '../util/sync';
import { KeyUtil } from '../util/key';
import { SmartPrompt } from '../util/smart';
import { WaitUtil } from '../util/wait';

/**
 * Project Architecture Overview
 * ----------------------------
 * Greasemonkey Script Architecture
 * Note: Due to Greasemonkey script constraints, ES6 modules (import/export) are not supported.
 * All code must be in global scope with proper namespacing through classes and factory pattern.
 */
export class Factory {
    private static _instances: Record<string, unknown> = {};

    /**
     * Client Layer
     * Handles external API interactions
     */
    public static client = {
        investing: (): InvestingClient => 
            Factory._getInstance('investingClient', () => new InvestingClient()),

        kite: (): KiteClient => 
            Factory._getInstance('kiteClient', () => new KiteClient()),

        kohan: (): KohanClient => 
            Factory._getInstance('kohanClient', () => new KohanClient()),
    };

    /**
     * Utility Layer
     * Handles utility operations and management
     */
    public static util = {
        dom: (): WaitUtil =>
            Factory._getInstance('waitUtil', () => new WaitUtil()),

        observer: (): ObserveUtil =>
            Factory._getInstance('observeUtil', () => new ObserveUtil()),

        search: (): SearchUtil =>
            Factory._getInstance('searchUtil', () => new SearchUtil()),

        sync: (): SyncUtil =>
            Factory._getInstance('syncUtil', () => new SyncUtil()),

        key: (): KeyUtil =>
            Factory._getInstance('keyUtil', () => new KeyUtil(Factory.util.sync())),

        smart: (): SmartPrompt =>
            Factory._getInstance('smartPrompt', () => new SmartPrompt()),

        ui: (): UIUtil =>
            Factory._getInstance('uiUtil', () => new UIUtil()),
    };

    // TODO: Repository Layer placeholder
    public static repo = {
        // To be implemented later
    };

    // TODO: Manager Layer placeholder
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