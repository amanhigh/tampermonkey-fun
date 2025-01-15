import { Constants } from '../models/constant';
import { IUIUtil } from '../util/ui';
import { ISyncUtil } from '../util/sync';
import { IWatchManager } from '../manager/watch';
import { ISymbolManager } from '../manager/symbol';
import { IRecentManager } from '../manager/recent';
import { Notifier } from '../util/notify';
import { AlertClicked } from '../models/events';
import { IAlertManager } from '../manager/alert';

export interface IAlertFeedHandler {
  /**
   * Initializes alert feed UI and sets up event listeners
   */
  initialize(): void;

  /**
   * Handles hook button interactions and alert feed updates
   */
  handleHookButton(): void;

  /**
   * Updates alert feed display
   */
  paintAlertFeed(): void;
}

export class AlertFeedHandler implements IAlertFeedHandler {
  constructor(
    private readonly uiUtil: IUIUtil,
    private readonly syncUtil: ISyncUtil,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager,
    private readonly recentManager: IRecentManager,
    private readonly alertManager: IAlertManager
  ) {}

  public initialize(): void {
    void this.syncUtil; // Will be used in handleHookButton
    void this.watchManager; // Will be used in paintAlertFeed

    const $area = this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN, '20px', '20px').css({
      position: 'fixed',
    });
    $area.appendTo('body');

    this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.HOOK, 'Hook', () => {
        this.handleHookButton();
      })
      .appendTo($area);

    // Listen to watch list changes
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.TV_WATCH_CHANGE,
      (_keyName: string, _oldValue: unknown, _newValue: unknown) => {
        this.paintAlertFeed();
      }
    );
  }

  public handleHookButton(): void {
    // Setup alert click handlers
    this.setupAlertClickHandler();
    // Paint feed with current state
    this.paintAlertFeed();
  }

  private setupAlertClickHandler(): void {
    $(Constants.DOM.ALERT_FEED.ALERT_TITLE).click((e) => {
      this.handleAlertClick(e);
    });
  }

  private handleAlertClick(event: JQuery.ClickEvent): void {
    event.preventDefault();

    const $element = $(event.currentTarget);
    const alertName = $element.text();
    const investingTicker = this.extractTickerFromAlertName(alertName);
    const tvTicker = this.symbolManager.investingToTv(investingTicker);

    if (event.ctrlKey) {
      // Ctrl+click for mapping
      // FIXME: Use Action with ticker instead of Null Values
      void this.alertManager.createAlertClickEvent(null, investingTicker);
    } else {
      // Normal click for opening ticker
      new AlertClicked(tvTicker || alertName, null);
      void this.alertManager.createAlertClickEvent(tvTicker || alertName, null);
    }
  }

  public paintAlertFeed(): void {
    console.log('Painting alert feed');

    console.log(Constants.DOM.ALERT_FEED.ALERT_DATA);
    console.log($(Constants.DOM.ALERT_FEED.ALERT_DATA));
    $(Constants.DOM.ALERT_FEED.ALERT_DATA).each((_, element) => {
      const $element = $(element);
      const alertName = $element.text();
      const investingTicker = this.extractTickerFromAlertName(alertName);
      const tvTicker = this.symbolManager.investingToTv(investingTicker);

      if (!tvTicker) {
        Notifier.warn(`Unmapped: ${alertName}`);
        return;
      }

      // Debug Logs for RITS
      if (investingTicker === 'RITS') {
        console.log('RITS Alert:', alertName, investingTicker, tvTicker);
        console.log('Watchlist:', this.watchManager.getDefaultWatchlist());
        console.log('Watchlist:', this.watchManager.getDefaultWatchlist().has(tvTicker));
        console.log('Recent:', this.recentManager.isRecent(tvTicker));
      }

      // Color based on watchlist and recent status
      if (this.watchManager.getDefaultWatchlist().has(tvTicker)) {
        // Watchlist symbols
        $element.css('color', 'orangered');
      } else if (this.recentManager.isRecent(tvTicker)) {
        // Recent symbols
        $element.css('color', 'lime');
      } else {
        // Default color
        $element.css('color', 'red');
      }
    });

    this.applyBlackTheme();
  }

  private applyBlackTheme(): void {
    // Alert Feed Theme
    $('body').css('background-color', '#0f0f0f');
    $(Constants.DOM.ALERT_FEED.WRAPPER).css('border', 'none');
    $('iframe').hide();

    // Alert List Theme
    $(Constants.DOM.ALERT_FEED.FLOATING_WRAPPER).css('background-color', 'black');
  }

  private extractTickerFromAlertName(alertName: string): string {
    const match = alertName.match(/\(([^)]+)\)/);
    return match ? match[1] : alertName;
  }
}
