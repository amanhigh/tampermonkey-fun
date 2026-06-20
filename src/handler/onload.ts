import { Constants } from '../models/constant';
import { IObserveUtil } from '../util/observer';
import { IWaitUtil } from '../util/wait';
import { IWatchListHandler } from './watchlist';
import { ITickerChangeHandler } from './ticker_change';
import { IHotkeyHandler } from './hotkey';
import { IAlertHandler } from './alert';
import { IPaintManager } from '../manager/paint';
import { IDomManager } from '../manager/dom';
import { IDomainEventConsumer, ISubscriber, IPublisher } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for application initialization handling
 */
export interface IOnLoadHandler {
  /**
   * Initializes application by setting up required observers and handlers
   */
  init(): void;
}

/**
 * Manages application initialization and observers.
 *
 * Initialization is serial:
 * 1. Register all domain event consumers (so FIRST_LOAD is handled)
 * 2. Set up static listeners (keydown, alert click, delink)
 * 3. Set up ticker observer
 * 4. Inside ticker callback, set up watchlist observer
 * 5. Inside watchlist callback, publish FIRST_LOAD and set up screener observer
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
    private readonly paintManager: IPaintManager,
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher,
    private readonly domainEventConsumers: IDomainEventConsumer[],
    private readonly subscriber: ISubscriber
  ) {}

  /** @inheritdoc */
  public init(): void {
    // 1. Register all domain event consumers BEFORE publishing FIRST_LOAD
    for (const consumer of this.domainEventConsumers) {
      consumer.registerEvents(this.subscriber);
    }

    // 2. Set up static listeners (no DOM dependency)
    this.setupKeydownEventListener();
    this.setupAlertClickListener();
    this.alertHandler.registerAlertTickerDelinkHandler();

    // 3. Start serial DOM observer setup
    this.setupTickerObserver(() => {
      this.setupWatchlistObserver(() => {
        // 5. Both DOM nodes confirmed — publish FIRST_LOAD and finish setup
        this.publishFirstLoad();
        this.setupScreenerObserver();
      });
    });
  }

  /**
   * Publishes FIRST_LOAD after both ticker and watchlist DOM are ready.
   * Subscribers are already registered at this point.
   */
  private publishFirstLoad(): void {
    const ticker = this.domManager.getTicker();
    void this.publisher.publish({
      type: DomainEventType.FIRST_LOAD,
      ticker,
    });
  }

  /**
   * Sets up ticker change observation using header element.
   * Calls onReady once the ticker DOM node is confirmed available
   * and the attribute observer is registered.
   * @param onReady Callback after ticker observer is established
   */
  private setupTickerObserver(onReady: () => void): void {
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

        // Proceed to next step in serial chain
        onReady();
      },
      10
    );
  }

  /**
   * Sets up alert click event listener
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
   * Sets up observers for watchlist DOM changes.
   * Calls onReady once the watchlist DOM node is confirmed available
   * and the node observer is registered.
   * @param onReady Callback after watchlist observer is established
   */
  private setupWatchlistObserver(onReady: () => void): void {
    this.waitUtil.waitJEE(
      `${Constants.DOM.WATCHLIST.CONTAINER} > div`,
      (element) => {
        const targetElement = element.get(0);
        if (!targetElement) {
          throw new Error('Unable to setup watchlist observer');
        }
        // Watch for watchlist DOM changes and refresh through snapshot diff
        this.observeUtil.nodeObserver(targetElement, () => {
          this.watchListHandler.onWatchListChange();
        });

        // Proceed to next step in serial chain
        onReady();
      },
      10
    );
  }

  /**
   * Sets up observer for screener DOM changes and handles repainting on widget recreation
   */
  private setupScreenerObserver(): void {
    // Use document.body as observer target (proven to work in console testing)
    const observeTarget = document.body;

    // Track screener state
    let wasScreenerOpen = $(Constants.DOM.SCREENER.MAIN).length > 0;
    // Direct observer with screener open/close detection
    try {
      this.observeUtil.nodeObserver(observeTarget, () => {
        const isScreenerOpen = $(Constants.DOM.SCREENER.MAIN).length > 0;

        // Only act on state changes
        if (isScreenerOpen !== wasScreenerOpen) {
          if (isScreenerOpen) {
            console.log('🟢 SCREENER OPENED - triggering repaint');
            setTimeout(() => {
              void this.paintManager
                .paint()
                .then(() => {
                  console.log('✅ Screener repainted successfully');
                })
                .catch((error) => {
                  console.error('❌ Error repainting screener:', error);
                });
            }, 50);
          } else {
            console.log('🔴 SCREENER CLOSED');
          }
          wasScreenerOpen = isScreenerOpen;
        }
      });

      console.log('✅ Screener observer established on document.body');
    } catch (error) {
      console.error('❌ Failed to setup screener observer:', error);
    }
  }
}
