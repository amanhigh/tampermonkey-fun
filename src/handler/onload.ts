import { Constants } from '../models/constant';
import { IObserveUtil } from '../util/observer';
import { IWaitUtil } from '../util/wait';
import { IWatchListHandler } from './watchlist';
import { ITickerChangeHandler } from './ticker_change';
import { IHotkeyHandler } from './hotkey';
import { IAlertHandler } from './alert';
import { ITradingViewScreenerManager } from '../manager/screener';

/**
 * Interface for application initialization handling
 */
export interface IOnLoadHandler {
  /**
   * Initializes application by setting up required observers and handlers
   * Currently handles:
   * - Watchlist observer for DOM changes
   * - Screener observer for widget recreation
   * - Ticker change observer
   * - Hotkey handlers
   * - Alert click listeners
   */
  init(): void;
}

/**
 * Manages application initialization and observers
 */
export class OnLoadHandler implements IOnLoadHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly observeUtil: IObserveUtil,
    private readonly watchListHandler: IWatchListHandler,
    private readonly hotkeyHandler: IHotkeyHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly tickerChangeHandler: ITickerChangeHandler,
    private readonly screenerManager: ITradingViewScreenerManager
  ) {}

  /** @inheritdoc */
  public init(): void {
    this.setupTickerObserver();
    this.setupWatchlistObserver();
    this.setupKeydownEventListener();
    this.setupAlertClickListener();
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
          const alertClickData = JSON.parse(newValue) as Parameters<typeof this.alertHandler.handleAlertClick>[0];
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

        // Set up screener observer
        this.setupScreenerObserver();
      },
      10
    );
  }

  /**
   * Sets up observer for screener DOM changes and handles repainting on widget recreation
   * @private
   */
  private setupScreenerObserver(): void {
    const toggleButton = $(Constants.DOM.SCREENER.BUTTON)[0];
    if (!toggleButton) {
      console.error('Screener toggle button not found');
      return;
    }

    const persistentParent = toggleButton.closest(Constants.DOM.SCREENER.PERSISTENT_PARENT) as HTMLElement;
    if (!persistentParent) {
      console.error('Screener persistent parent not found');
      return;
    }

    // Direct observer with inline screener repaint logic
    try {
      this.observeUtil.nodeObserver(persistentParent, () => {
        // Check if screener widget was added and repaint immediately
        if ($(Constants.DOM.SCREENER.MAIN).length > 0) {
          setTimeout(() => {
            try {
              this.screenerManager.paintScreener();
              console.log('Screener repainted after widget recreation');
            } catch (error) {
              console.error('Error repainting screener:', error);
            }
          }, 100);
        }
      });

      console.log('Screener observer established on persistent parent');
    } catch (error) {
      console.error('Failed to setup screener observer:', error);
    }
  }
}
