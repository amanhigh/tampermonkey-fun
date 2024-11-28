import { AlertState, PairInfo } from '../models/alert';
import { IAlertRepo } from '../repo/alert';
import { ISymbolManager } from './symbol';
import { Notifier } from '../util/notify';

/**
 * Interface for managing audit UI operations
 */
interface IAuditUIManager {
    refreshAuditButton(ticker: string, state: AlertState): void;
    updateAuditSummary(): void;
}

/**
 * Interface for Audit management operations
 */
export interface IAuditManager {
    /**
     * Initiates the auditing process for all alerts
     */
    auditAlerts(): void;

    /**
     * Audits the current ticker and updates its state
     */
    auditCurrentTicker(): void;
}

/**
 * Class representing the Audit Manager.
 */
export class AuditManager implements IAuditManager {
    private _currentIndex: number;
    private readonly _batchSize: number;

    /**
     * Creates an instance of AuditManager.
     * @param alertRepo - The repository for managing alerts.
     * @param uiManager - The instance of UI manager for audit operations.
     * @param symbolManager - The manager for symbol operations
     * @param batchSize - Size of processing batch, defaults to 50
     */
    constructor(
        private readonly _alertRepo: IAlertRepo,
        private readonly _uiManager: IAuditUIManager,
        private readonly _symbolManager: ISymbolManager,
        batchSize = 50
    ) {
        this._currentIndex = 0;
        this._batchSize = batchSize;
    }

    /********** Public Methods **********/

    /** @inheritdoc */
    auditAlerts(): void {
        this._alertRepo.clearAuditResults();
        const tickers = this._getAllAlertTickers();
        this._currentIndex = 0;
        this._processBatch(tickers);
    }

    /** @inheritdoc */
    auditCurrentTicker(): void {
        const ticker = this._getMappedTicker();
        const state = this._auditTickerAlerts(ticker);
        this._alertRepo.addAuditResult(ticker, state);
        this._uiManager.refreshAuditButton(ticker, state);
    }

    /********** Private Methods **********/

    /**
     * Gets all tickers that have alerts
     * @private
     * @returns Array of ticker symbols
     */
    private _getAllAlertTickers(): string[] {
        // TODO: Implement this method - missing in original
        return [];
    }

    /**
     * Gets the mapped ticker for the current context
     * @private
     * @returns Mapped ticker symbol
     */
    private _getMappedTicker(): string {
        // TODO: Implement this method - missing in original
        return '';
    }

    /**
     * Processes batches of tickers for auditing.
     * @param tickers - The list of tickers to process.
     * @private
     */
    private _processBatch(tickers: string[]): void {
        const endIndex = Math.min(this._currentIndex + this._batchSize, tickers.length);
        
        for (let i = this._currentIndex; i < endIndex; i++) {
            const ticker = tickers[i];
            const state = this._auditTickerAlerts(ticker);
            this._alertRepo.addAuditResult(ticker, state);
        }
        
        this._currentIndex = endIndex;
        
        if (this._currentIndex < tickers.length) {
            requestAnimationFrame(() => this._processBatch(tickers));
        } else {
            Notifier.message(`Audited ${this._alertRepo.getAuditResultsCount()} tickers`, 'green');
            this._uiManager.updateAuditSummary();
        }
    }

    /**
     * Audits alerts for a single ticker.
     * @param ticker - The ticker to audit.
     * @returns The audit state for the ticker.
     * @private
     */
    private _auditTickerAlerts(ticker: string): AlertState {
        const pairInfo = this._symbolManager.mapInvestingPair(ticker);
        if (!pairInfo) {
            return AlertState.NO_ALERTS;
        }

        const alerts = this._alertRepo.getAlerts(pairInfo.pairId);
        
        return alerts.length === 0 ? AlertState.NO_ALERTS :
               alerts.length === 1 ? AlertState.SINGLE_ALERT :
               AlertState.VALID;
    }
}
