import { Constants } from '../models/constant';
import { IObserveUtil } from '../util/observer';
import { IWaitUtil } from '../util/wait';
import { IWatchListHandler } from './watchlist';
import { Notifier } from '../util/notify';

/**
 * Interface for application initialization handling
 */
export interface IOnLoadHandler {
  /**
   * Initializes application by setting up required observers and handlers
   * Currently handles:
   * - Watchlist observer for DOM changes
   */
  init(): void;
}

/**
 * Manages application initialization and observers
 */
export class OnLoadHandler implements IOnLoadHandler {
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly observeUtil: IObserveUtil,
    private readonly watchListHandler: IWatchListHandler
  ) {}

  /** @inheritdoc */
  public init(): void {
    this.setupWatchlistObserver();
  }

  /**
   * Sets up observers for watchlist DOM changes
   * @private
   */
  private setupWatchlistObserver(): void {
    this.waitUtil.waitJEE(
      `${Constants.DOM.WATCHLIST.CONTAINER} > div`,
      (element) => {
        const targetElement = element.get(0);
        if (!targetElement) {
          Notifier.error('Failed to get watchlist element');
          return;
        }
        // Watch for watchlist DOM changes
        this.observeUtil.nodeObserver(targetElement, this.watchListHandler.onWatchListChange);

        // Set up screener observer if exists
        Notifier.info('Waiting for Screener');
        this.waitUtil.waitJEE(
          Constants.DOM.SCREENER.MAIN,
          (screenerElement) => {
            const targetElement = screenerElement.get(0);
            if (!targetElement) {
              Notifier.error('Failed to get screener element');
              return;
            }
            this.observeUtil.nodeObserver(targetElement, this.watchListHandler.onWatchListChange);
            Notifier.success('Screener Hooked');
          },
          10
        );
      },
      10
    );
  }
}
