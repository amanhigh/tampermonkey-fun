import { Constants, AuditId } from '../models/constant';
import { AuditSectionRegistry } from '../util/audit_registry';
import { IUIUtil } from '../util/ui';
import { AuditRenderer } from '../util/audit_renderer';
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
 *
 * Internal structure:
 * - Event Registration: registerEvents delegates to named private handlers
 * - Event Handlers: one method per subscribed event type
 * - Audit Execution: run full or ordered audits
 * - Targeted Updates: refresh specific ticker sections
 * - Toolbar: render toolbar and handle button clicks
 * - Renderer Lifecycle: get or create cached renderers
 */
export class AuditHandler implements IAuditHandler {
  // Preserve renderer instances across audit runs to retain collapse state
  private readonly renderers: Map<string, AuditRenderer> = new Map();

  constructor(
    private readonly auditRegistry: AuditSectionRegistry,
    private readonly uiUtil: IUIUtil,
    private readonly alertTickerHandler: IAlertTickerHandler,
    private readonly domManager: IDomManager
  ) {}

  // ── Public API ──

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    subscriber.subscribe(DomainEventType.FIRST_LOAD, this.handleFirstLoad);
    subscriber.subscribeMany(
      [DomainEventType.ALERTS_CHANGED, DomainEventType.ALERT_TICKER_LINKED, DomainEventType.ALERT_TICKER_DELETED],
      this.handleAlertAuditChanged
    );
    subscriber.subscribe(DomainEventType.TICKER_CATEGORY_CHANGED, this.handleTickerCategoryChanged);
    subscriber.subscribe(DomainEventType.TICKER_TRACKING_STARTED, this.handleTickerTrackingStarted);
    subscriber.subscribe(DomainEventType.TICKER_TRACKING_STOPPED, this.handleTickerTrackingStopped);
  }

  // ── Event Handlers ──

  /** FIRST_LOAD: run full audit once during app initialization */
  private readonly handleFirstLoad = (): void => {
    void this.runFullAudit();
  };

  /** ALERTS_CHANGED, ALERT_TICKER_LINKED, and ALERT_TICKER_DELETED usually carry a ticker */
  private readonly handleAlertAuditChanged = async (event: { ticker?: string }): Promise<void> => {
    if (!event.ticker) {
      return;
    }
    await this.refreshTickerAudit(event.ticker, [Constants.AUDIT.PLUGINS.ALERT_COVERAGE]);
  };

  /** Category changes affect GTT unwatched status */
  private readonly handleTickerCategoryChanged = async (event: { tickers: string[] }): Promise<void> => {
    for (const ticker of event.tickers) {
      await this.refreshTickerAudit(ticker, [Constants.AUDIT.PLUGINS.GTT_UNWATCHED]);
    }
  };

  /** New ticker may affect all audit sections — full refresh */
  private readonly handleTickerTrackingStarted = (): void => {
    void this.runFullAudit();
  };

  /** Stopped tracking — remove ticker from renderers optimistically */
  private readonly handleTickerTrackingStopped = (event: { ticker: string }): void => {
    this.removeTickerFromSections(event.ticker);
  };

  // ── Audit Execution ──

  /**
   * Runs all audit sections and renders/refreshes the toolbar.
   */
  private async runFullAudit(): Promise<void> {
    this.renderToolbarButtons();
    await this.runOrderedAudits();
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

  // ── Targeted Section Updates ──

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

  // ── Toolbar ──

  /**
   * Renders toolbar buttons at the top of audit area:
   * Refresh All and Map Alert in a flex row
   */
  private renderToolbarButtons(): void {
    const $auditArea = $(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    const refreshId = Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH;
    const mapAlertId = Constants.UI.IDS.BUTTONS.AUDIT_MAP_ALERT;

    // Remove old toolbar if exists (in case of re-render)
    $auditArea.find('.audit-toolbar').remove();

    const $toolbar = $('<div>').addClass('audit-toolbar');

    // Refresh All button
    this.uiUtil.buildButton(refreshId, '\u{1F504} Refresh', this.handleRefreshAllClick).appendTo($toolbar);

    // Map Alert button (FR-9.9)
    this.uiUtil.buildButton(mapAlertId, '\u{1F517} Map', this.handleMapAlertClick).appendTo($toolbar);

    $toolbar.prependTo($auditArea);
  }

  /** Refresh All button click handler */
  private readonly handleRefreshAllClick = (): void => {
    void this.runFullAudit();
  };

  /** Map Alert button click handler (FR-9.9) */
  private readonly handleMapAlertClick = (): void => {
    const ticker = this.domManager.getTicker();
    void this.alertTickerHandler.linkInvestingTicker(ticker);
  };

  // ── Renderer Lifecycle ──

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
