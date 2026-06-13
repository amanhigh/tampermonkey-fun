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
import { AlertTicker } from '../models/alert_ticker';
import { IEventBus, IDomainEventConsumer } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event_type';

export interface IAlertFeedHandler extends IDomainEventConsumer {
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

  /** @inheritdoc */
  public registerDomainEvents(eventBus: IEventBus): void {
    eventBus.subscribeMany(
      [DomainEventType.ALERT_TICKER_LINKED, DomainEventType.TICKER_MARKED_RECENT],
      async (event) => {
        await this.alertFeedManager.createAlertFeedEvent(event.tvTicker);
      }
    );
  }

  public handleHookButton(): void {
    // Setup alert click handlers
    this.setupAlertClickHandler();
    // Paint feed with current state
    void this.paintAlertFeed();
  }

  private setupAlertClickHandler(): void {
    $(Constants.DOM.ALERT_FEED.ALERT_TITLE).click((e) => {
      void this.handleAlertClick(e);
    });
  }

  private async handleAlertClick(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const $element = $(event.currentTarget);
    const { name, ticker, href } = this.extractAlertInfo($element);

    const action = event.ctrlKey ? AlertClickAction.MAP : AlertClickAction.OPEN;

    // Resolve alert identity; only publish event if trusted identity is found
    const identity = await this.resolveAlertIdentity(ticker, name, href);
    if (identity) {
      void this.alertManager.createAlertClickEvent(identity.alertTicker, action, identity.pairId, identity.alertName);
    } else {
      Notifier.warn(`Cannot resolve alert identity for ${name}`);
    }
  }

  /**
   * Resolve alert identity (backend-safe symbol, pair id, and name) for a given alert.
   * Returns null when no trusted identity can be resolved.
   *
   * Priority:
   *   1. Existing AlertTicker by extracted symbol
   *   2. InvestingManager.getInstrument() via name+href
   */
  private async resolveAlertIdentity(
    ticker: string,
    name: string,
    href?: string
  ): Promise<{ alertTicker: string; pairId: string; alertName: string } | null> {
    // Priority 1: existing AlertTicker record
    const alertTicker = await this.alertTickerManager.fetchAlertTicker(ticker);
    if (alertTicker) {
      return { alertTicker: alertTicker.symbol, pairId: alertTicker.pair_id, alertName: alertTicker.name };
    }

    // Priority 2: resolve via instrument API using name and href
    if (href) {
      const instrument = await this.investingManager.getInstrument(name, href);
      if (instrument) {
        return {
          alertTicker: instrument.symbol,
          pairId: instrument.id.toString(),
          alertName: instrument.description,
        };
      }
    }

    // Neither backend nor instrument could resolve — return null
    return null;
  }

  /**
   * Check whether the given element is inside a quote-type alert wrapper.
   * Economic-calendar (ec) and other non-quote rows are excluded.
   */
  private isQuoteAlert($element: JQuery): boolean {
    const $wrapper = $element.closest(Constants.DOM.ALERT_FEED.WRAPPER);
    return $wrapper.attr('data-type') === 'quotes';
  }

  /**
   * Normalize a string for fuzzy matching: lowercase, remove non-alphanumeric chars.
   */
  private normalizeAlertText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /**
   * Resolve a feed row to an AlertTicker record using only mapped backend data.
   * Order:
   *   1. Exact symbol match (from parentheses extraction or full title)
   *   2. Exact normalized name match
   *   3. Unique normalized prefix match
   *   4. Unique normalized contains match
   *   5. null (unmapped)
   */
  private resolvePaintAlertTicker(
    feedTitle: string,
    extractedTicker: string,
    alertTickers: AlertTicker[]
  ): AlertTicker | null {
    const feedNorm = this.normalizeAlertText(feedTitle);
    const extractedNorm = this.normalizeAlertText(extractedTicker);

    // 1. Exact symbol match
    const bySymbol = alertTickers.filter((at) => this.normalizeAlertText(at.symbol) === extractedNorm);
    if (bySymbol.length === 1) {
      return bySymbol[0];
    }

    // 2. Exact normalized name match
    const byName = alertTickers.filter((at) => this.normalizeAlertText(at.name) === feedNorm);
    if (byName.length === 1) {
      return byName[0];
    }

    // 3. Unique normalized prefix match
    const byPrefix = alertTickers.filter((at) => {
      const nameNorm = this.normalizeAlertText(at.name);
      return nameNorm.startsWith(feedNorm) || feedNorm.startsWith(nameNorm);
    });
    if (byPrefix.length === 1) {
      return byPrefix[0];
    }

    // 4. Unique normalized contains match (only if exactly one candidate)
    const byContains = alertTickers.filter((at) => {
      const nameNorm = this.normalizeAlertText(at.name);
      return nameNorm.includes(feedNorm) || feedNorm.includes(nameNorm);
    });
    if (byContains.length === 1) {
      return byContains[0];
    }

    return null;
  }

  public async paintAlertFeed(): Promise<void> {
    Notifier.yellow('🎨 Painting alert feed');

    // Collect quote-only elements upfront
    const elements: Array<{ $el: JQuery; name: string; ticker: string }> = [];
    $(Constants.DOM.ALERT_FEED.ALERT_DATA).each((_, element) => {
      const $element = $(element);
      if (!this.isQuoteAlert($element)) {
        return; // Skip non-quote rows (ec, etc.)
      }
      const { name, ticker } = this.extractAlertInfo($element);
      elements.push({ $el: $element, name, ticker });
    });

    // Load all mapped alert tickers once (no per-row search)
    const allAlertTickers = await this.alertTickerManager.getAlertTickers();

    // Resolve each element's state
    const feedInfos = await Promise.all(
      elements.map(async (e) => {
        const resolved = this.resolvePaintAlertTicker(e.name, e.ticker, allAlertTickers);
        return this.alertFeedManager.getAlertFeedState(resolved);
      })
    );

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
