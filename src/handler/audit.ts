import { Constants, AuditId } from '../models/constant';
import { AuditSectionRegistry } from '../util/audit_registry';
import { IUIUtil } from '../util/ui';
import { AuditRenderer } from '../util/audit_renderer';
import { ITickerHandler } from './ticker';
import { IAlertTickerHandler } from './alert_ticker';
import { IDomManager } from '../manager/dom';
import { ISubscriber, IDomainEventConsumer } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for managing audit UI operations.
 *
 * Only exposes domain event consumer registration; all audit execution
 * is event-driven or triggered internally via toolbar button callbacks.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAuditHandler extends IDomainEventConsumer {}

/**
 * Handles audit section UI operations
 *
 * Architecture:
 * - Gets sections from registry (sections contain plugins)
 * - Runs plugins via section.plugin.run()
 * - Renders sections via AuditRenderer
 * - NO button management (only audit sections)
 */
export class AuditHandler implements IAuditHandler {
  // Preserve renderer instances across audit runs to retain collapse state
  private readonly renderers: Map<string, AuditRenderer> = new Map();

  constructor(
    private readonly auditRegistry: AuditSectionRegistry,
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly alertTickerHandler: IAlertTickerHandler,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    // FIRST_LOAD: run full audit once during app initialization
    subscriber.subscribe(DomainEventType.FIRST_LOAD, () => {
      void this.runFullAudit();
    });

    // ALERTS_CHANGED and ALERT_TICKER_LINKED always carry a ticker
    subscriber.subscribeMany([DomainEventType.ALERTS_CHANGED, DomainEventType.ALERT_TICKER_LINKED], async (event) => {
      if (!('ticker' in event)) {
        return;
      }
      await this.refreshTickerAudit((event as { ticker: string }).ticker, [Constants.AUDIT.PLUGINS.ALERT_COVERAGE]);
    });

    // ALERT_TICKER_DELETED may not carry ticker (direct delink on current row)
    subscriber.subscribe(DomainEventType.ALERT_TICKER_DELETED, async (event) => {
      if (!event.ticker) {
        return;
      }
      await this.refreshTickerAudit(event.ticker, [Constants.AUDIT.PLUGINS.ALERT_COVERAGE]);
    });

    // Category changes affect GTT unwatched status
    subscriber.subscribe(DomainEventType.TICKER_CATEGORY_CHANGED, async (event) => {
      for (const ticker of event.tickers) {
        await this.refreshTickerAudit(ticker, [Constants.AUDIT.PLUGINS.GTT_UNWATCHED]);
      }
    });

    // New ticker may affect all audit sections — full refresh
    subscriber.subscribe(DomainEventType.TICKER_TRACKING_STARTED, () => {
      void this.runFullAudit();
    });

    // Stopped tracking — remove ticker from renderers optimistically
    subscriber.subscribe(DomainEventType.TICKER_TRACKING_STOPPED, (event) => {
      this.removeTickerFromSections(event.ticker);
    });
  }

  /**
   * Runs all audit sections and renders/refreshes the toolbar.
   */
  private async runFullAudit(): Promise<void> {
    this.renderToolbarButtons();
    await this.runOrderedAudits();
  }

  /**
   * Refreshes targeted audit sections for a specific ticker.
   * Skips sections not yet rendered and plugins that do not support targeted mode.
   * @param ticker - Ticker symbol to audit
   * @param auditIds - Audit section IDs to refresh
   */
  private async refreshTickerAudit(ticker: string, auditIds: AuditId[]): Promise<void> {
    for (const auditId of auditIds) {
      const renderer = this.renderers.get(auditId);
      if (!renderer) {
        continue; // Section not yet rendered
      }

      try {
        const section = this.auditRegistry.getSection(auditId);
        if (!section) {
          continue;
        }
        const results = await section.plugin.run([ticker]);
        renderer.setResults(results);
      } catch {
        // Plugin does not support targeted mode — skip auto-refresh
      }
    }
  }

  /**
   * Removes a ticker from all rendered audit sections optimistically.
   * Used when a ticker stops being tracked — avoids full recompute.
   * @param ticker - Ticker symbol to remove
   */
  private removeTickerFromSections(ticker: string): void {
    for (const renderer of this.renderers.values()) {
      renderer.removeTicker(ticker);
    }
  }

  /**
   * Runs all audits in order number sequence (FR-9.1, FR-9.10)
   */
  private async runOrderedAudits(): Promise<void> {
    const orderedSections = this.auditRegistry.listSectionsOrdered();

    for (const section of orderedSections) {
      const renderer = this.getOrCreateRenderer(section.id as AuditId);
      await renderer.refresh();
    }
  }

  /**
   * Renders toolbar buttons at the top of audit area:
   * Refresh All, Stop Tracking, and Map Alert in a flex row
   */
  private renderToolbarButtons(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const refreshId = Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH;
    const stopTrackId = Constants.UI.IDS.BUTTONS.AUDIT_STOP_TRACKING;
    const mapAlertId = Constants.UI.IDS.BUTTONS.AUDIT_MAP_ALERT;

    // Remove old toolbar if exists (in case of re-render)
    $auditArea.find('.audit-toolbar').remove();

    const $toolbar = $('<div>').addClass('audit-toolbar');

    // Refresh All button
    this.uiUtil
      .buildButton(refreshId, '\u{1F504} Refresh', () => {
        void this.runFullAudit();
      })
      .appendTo($toolbar);

    // Stop Tracking button (FR-9.8)
    this.uiUtil
      .buildButton(stopTrackId, '⏹ Stop', () => {
        void (async () => {
          const tvTicker = this.domManager.getTicker();
          if (confirm(`Stop tracking ${tvTicker}?`)) {
            await this.tickerHandler.stopTracking(tvTicker);
          }
        })();
      })
      .appendTo($toolbar);

    // Map Alert button (FR-9.9)
    this.uiUtil
      .buildButton(mapAlertId, '\u{1F517} Map', () => {
        const ticker = this.domManager.getTicker();
        void this.alertTickerHandler.linkInvestingTicker(ticker);
      })
      .appendTo($toolbar);

    $toolbar.prependTo($auditArea);
  }

  /**
   * Gets or creates a renderer for a section, preserving collapse state across runs
   * On first call: creates renderer and appends to DOM
   * On subsequent calls: returns existing renderer (collapse state preserved)
   */
  private getOrCreateRenderer(sectionId: AuditId): AuditRenderer {
    const existing = this.renderers.get(sectionId);
    if (existing) {
      return existing;
    }

    const section = this.auditRegistry.mustGetSection(sectionId);
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const renderer = new AuditRenderer(section, this.uiUtil, $auditArea);
    renderer.render();
    this.renderers.set(sectionId, renderer);
    return renderer;
  }
}
