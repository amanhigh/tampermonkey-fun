import { Constants } from '../models/constant';
import { IUIUtil } from '../util/ui';
import { ISyncUtil } from '../util/sync';
import { Notifier } from '../util/notify';
import { AlertClickAction } from '../models/events';
import { IAlertManager } from '../manager/alert';
import { AlertFeedManager } from '../manager/alertfeed';
import { AlertFeedEvent, FeedInfo } from '../models/alertfeed';

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
    private readonly alertManager: IAlertManager,
    private readonly alertFeedManager: AlertFeedManager
  ) {}

  public initialize(): void {
    void this.syncUtil; // Will be used in handleHookButton

    const $area = this.uiUtil.buildArea(Constants.UI.IDS.AREAS.MAIN, '20px', '20px').css({
      position: 'fixed',
    });
    $area.appendTo('body');

    this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.HOOK, 'Hook', () => {
        this.handleHookButton();
      })
      .appendTo($area);

    // Listen to alert feed updates
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (newValue) {
          const event = AlertFeedEvent.fromString(newValue as string);
          if (event.investingTicker === Constants.MISC.RESET_FEED) {
            // BUG: Trigger Reload of Page ?
            this.paintAlertFeed();
          } else {
            this.updateTicker(event.investingTicker, event.feedInfo);
          }
        }
      }
    );

    // Run Handle Hook Button with Delay
    setTimeout(() => {
      this.handleHookButton();
    }, 2000);

    console.log('Alert Feed initialized');
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

    const action = event.ctrlKey ? AlertClickAction.MAP : AlertClickAction.OPEN;
    void this.alertManager.createAlertClickEvent(investingTicker, action);
  }

  public paintAlertFeed(): void {
    Notifier.message('Painting alert feed', 'yellow');
    $(Constants.DOM.ALERT_FEED.ALERT_DATA).each((_, element) => {
      const $element = $(element);
      const alertName = $element.text();
      const investingTicker = this.extractTickerFromAlertName(alertName);

      // Get feed info from manager
      const feedInfo = this.alertFeedManager.getAlertFeedState(investingTicker);

      // Apply appropriate color based on state
      $element.css('color', feedInfo.color);
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

  private updateTicker(investingTicker: string, feedInfo: FeedInfo): void {
    $(Constants.DOM.ALERT_FEED.ALERT_DATA).each((_, element) => {
      const $element = $(element);
      const alertName = $element.text();
      const ticker = this.extractTickerFromAlertName(alertName);

      if (ticker === investingTicker) {
        $element.css('color', feedInfo.color);
      }
    });
  }

  private extractTickerFromAlertName(alertName: string): string {
    const match = alertName.match(/\(([^)]+)\)/);
    return match ? match[1] : alertName;
  }
}
