import { Constants } from '../models/constant';
import { IObserveUtil } from '../util/observer';
import { IWaitUtil } from '../util/wait';
import { IWatchListHandler } from './watchlist';
import { ITickerChangeHandler } from './ticker_change';
import { Notifier } from '../util/notify';
import { IHotkeyHandler } from './hotkey';
import { IAlertHandler } from './alert';

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
import { ISwiftKeyHandler } from './swiftkey';

export class OnLoadHandler implements IOnLoadHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly observeUtil: IObserveUtil,
    private readonly watchListHandler: IWatchListHandler,
    private readonly hotkeyHandler: IHotkeyHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly tickerChangeHandler: ITickerChangeHandler,
    private readonly swiftKeyHandler: ISwiftKeyHandler
  ) {}

  private setupTitleListener(): void {
    this.waitUtil.waitJEE('title', ($element) => {
      this.observeUtil.nodeObserver($element[0], () => {
        this.swiftKeyHandler.syncTitle();
      });
    });
  }

  /** @inheritdoc */
  public init(): void {
    this.setupTickerObserver();
    this.setupWatchlistObserver();
    this.setupKeydownEventListener();
    this.setupAlertClickListener();
    this.setupTitleListener();
  }

  /**
   * Sets up ticker change observation using header element
   * @private
   */
  private setupTickerObserver(): void {
    this.waitUtil.waitJEE(
      Constants.DOM.HEADER.MAIN,
      ($element) => {
        const targetElement = $element.get(0);
        if (!targetElement) {
          throw new Error('Unable to setup ticker observer');
        }
        this.observeUtil.attributeObserver(targetElement, () => {
          this.tickerChangeHandler.onTickerChange();
        });

        // Fire now to load Display
        this.tickerChangeHandler.onTickerChange();
      },
      10
    );
  }

  /**
   * Sets up alert click event listener
   * @private
   */
  private setupAlertClickListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.ALERT_CLICKED,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (newValue && typeof newValue === 'string') {
          const alertClickData = JSON.parse(newValue);
          this.alertHandler.handleAlertClick(alertClickData);
        }
      }
    );
  }

  private setupKeydownEventListener(): void {
    document.addEventListener('keydown', (event) => {
      this.hotkeyHandler.handleKeyDown(event);
    });
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
          throw new Error('Unable to setup watchlist observer');
        }
        // Watch for watchlist DOM changes
        this.observeUtil.nodeObserver(targetElement, () => {
          this.watchListHandler.onWatchListChange();
        });

        // Apply default filters before first paint
        this.watchListHandler.applyDefaultFilters();
        this.watchListHandler.onWatchListChange();

        // Set up screener observer if exists
        Notifier.info('Waiting for Screener');
        this.waitUtil.waitJEE(
          Constants.DOM.SCREENER.MAIN,
          (screenerElement) => {
            const targetElement = screenerElement.get(0);
            if (!targetElement) {
              throw new Error('Unable to setup screener observer');
            }
            this.observeUtil.nodeObserver(targetElement, () => {
              this.watchListHandler.onWatchListChange();
            });
            Notifier.success('Screener Hooked');
          },
          10
        );
      },
      10
    );
  }
}
