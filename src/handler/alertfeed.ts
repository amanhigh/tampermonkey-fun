import { Constants } from '../models/constant';
import { IUIUtil } from '../util/ui';
import { ISyncUtil } from '../util/sync';
import { Notifier } from '../util/notify';
import { AlertClickAction } from '../models/events';
import { IAlertManager } from '../manager/alert';
import { IAlertFeedManager } from '../manager/alertfeed';
import { AlertFeedEvent, FeedInfo, FeedState } from '../models/alertfeed';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { IInvestingManager } from '../manager/investing';

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
  paintAlertFeed(): Promise<void>;
}

export class AlertFeedHandler implements IAlertFeedHandler {
  constructor(
    private readonly uiUtil: IUIUtil,
    private readonly syncUtil: ISyncUtil,
    private readonly alertManager: IAlertManager,
    private readonly alertFeedManager: IAlertFeedManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly investingManager: IInvestingManager
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
            // Reload the page
            window.location.reload();
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
  }

  public handleHookButton(): void {
    // Setup alert click handlers
    this.setupAlertClickHandler();
    // Paint feed with current state
    void this.paintAlertFeed();
  }

  private setupAlertClickHandler(): void {
    $(Constants.DOM.ALERT_FEED.ALERT_TITLE).click((e) => {
      this.handleAlertClick(e);
    });
  }

  private async handleAlertClick(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const $element = $(event.currentTarget);
    const { name, ticker, href } = this.extractAlertInfo($element);

    const action = event.ctrlKey ? AlertClickAction.MAP : AlertClickAction.OPEN;

    // Resolve pairId and publish event
    const pairId = await this.resolvePairId(ticker, name, href);
    void this.alertManager.createAlertClickEvent(ticker, action, pairId);
  }

  /**
   * Resolve Investing.com pair ID for a given alert ticker.
   * Priority: existing AlertTicker by symbol → InvestingManager.getInstrument() via name+href
   */
  private async resolvePairId(ticker: string, name: string, href?: string): Promise<string | undefined> {
    const alertTicker = await this.alertTickerManager.fetchAlertTicker(ticker);
    if (alertTicker?.pair_id) {
      return alertTicker.pair_id;
    }

    // Fallback: resolve via instrument API using name and href
    if (href) {
      const instrument = await this.investingManager.getInstrument(name, href);
      if (instrument) {
        return instrument.id.toString();
      }
    }

    return undefined;
  }

  public async paintAlertFeed(): Promise<void> {
    Notifier.yellow('🎨 Painting alert feed');
    const elements: Array<{ $el: JQuery; ticker: string }> = [];
    $(Constants.DOM.ALERT_FEED.ALERT_DATA).each((_, element) => {
      const $element = $(element);
      const { ticker } = this.extractAlertInfo($element);
      elements.push({ $el: $element, ticker });
    });

    const feedInfos = await Promise.all(elements.map(async (e) => this.alertFeedManager.getAlertFeedState(e.ticker)));

    elements.forEach(({ $el, ticker }, i) => {
      const feedInfo = feedInfos[i];
      if (feedInfo.state === FeedState.UNMAPPED) {
        Notifier.warn(`Unmapped: ${ticker}`);
      }
      $el.css('color', feedInfo.color);
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
      const { ticker } = this.extractAlertInfo($element);

      if (ticker === investingTicker) {
        $element.css('color', feedInfo.color);
      }
    });
  }

  private extractAlertInfo($element: JQuery): { name: string; ticker: string; href: string | undefined } {
    const name = $element.text();
    const ticker = this.extractTicker(name);
    const $parentAnchor = $element.closest('a');
    const href = $parentAnchor.attr('href') ?? undefined;
    return { name, ticker, href };
  }

  private extractTicker(alertName: string): string {
    const match = alertName.match(/\(([^)]+)\)/);
    return match ? match[1] : alertName;
  }
}
