import { AuditResult } from '../models/audit';
import { Constants } from '../models/constant';
import { IUIUtil } from '../util/ui';
import { IAuditSection } from '../handler/audit_section';

/**
 * Renderer for audit sections - displays audit results with interactive UI
 * Provides: header with status, collapsible body with action buttons
 *
 * Features:
 * - Click header to expand/collapse
 * - Left-click button for primary action
 * - Right-click button for secondary action
 * - Refresh button to re-run audit
 * - Auto-update on action completion
 *
 * Architecture:
 * - Receives section specification (IAuditSection) which defines what to render
 * - Takes runtime context ($container) to know where to render
 * - Created at runtime by handlers, not by Factory (transient, not singleton)
 */
export class AuditRenderer {
  private collapsed: boolean = true;
  private results: AuditResult[] = [];
  private running: boolean = false;
  private currentPage: number = 0;
  private lastRunTime: number = Date.now();

  constructor(
    private readonly section: IAuditSection,
    private readonly uiUtil: IUIUtil,
    private readonly $container: JQuery
  ) {}

  /**
   * Render the audit section to the container
   */
  public render(): void {
    const $section = this.buildSection();
    $section.appendTo(this.$container);
  }

  /**
   * Rebuild section with current results (after actions)
   */
  public async refresh(): Promise<void> {
    // Re-run audit to get latest results
    await this.runAudit();

    // Update section in DOM
    this.updateSectionInDOM();
  }

  /**
   * Build the complete section
   */
  private buildSection(): JQuery {
    const $section = $('<div>')
      .attr('id', `audit-section-${this.section.id}`)
      .addClass(Constants.AUDIT.CLASSES.SECTION);

    // Add status class based on results
    const statusClass =
      this.results.length === 0 ? Constants.AUDIT.CLASSES.STATUS_PASS : Constants.AUDIT.CLASSES.STATUS_WARN;
    $section.addClass(statusClass);

    // Header (always visible)
    this.buildHeader().appendTo($section);

    // Body (collapsible)
    const $body = this.buildBody();
    if (this.collapsed) {
      $body.hide();
    }
    $body.appendTo($section);

    return $section;
  }

  /**
   * Update section in DOM (consolidated from 3 duplicate locations)
   */
  private updateSectionInDOM(): void {
    const $existing = $(`#audit-section-${this.section.id}`);
    if ($existing.length) {
      $existing.replaceWith(this.buildSection());
    }
  }

  /**
   * Set refresh button enabled/disabled state
   */
  private setRefreshButtonState($button: JQuery, enabled: boolean): void {
    $button.prop('disabled', !enabled).css('opacity', enabled ? '1' : '0.5');
  }

  /**
   * Build header with title, status, and refresh button
   */
  private buildHeader(): JQuery {
    const icon = this.collapsed ? '►' : '▼';
    const headerText = this.section.headerFormatter(this.results, this.section.context);

    // Always append timestamp to header
    const fullHeaderText = `${headerText} - ${this.getTimestampText()}`;

    const $header = $('<div>')
      .addClass(Constants.AUDIT.CLASSES.SECTION_HEADER)
      .attr('title', this.section.description ?? '')
      .on('click', () => this.toggleCollapse());

    // Expand/collapse icon + header text
    $('<span>').addClass(Constants.AUDIT.CLASSES.HEADER_ICON).html(icon).appendTo($header);

    $('<span>').addClass(Constants.AUDIT.CLASSES.HEADER_TEXT).html(fullHeaderText).appendTo($header);

    // Fix All button (only when section declares onFixAll and has results)
    if (this.section.onFixAll && this.results.length > 0) {
      const $fixAll = this.uiUtil
        .buildButton(`audit-fixall-${this.section.id}`, '🔧 Fix All', () => {
          void this.handleFixAll();
        })
        .addClass(Constants.AUDIT.CLASSES.SECTION_REFRESH);

      this.setRefreshButtonState($fixAll, !this.running);
      $fixAll.appendTo($header);
    }

    // Refresh button
    const $refresh = this.uiUtil
      .buildButton(`audit-refresh-${this.section.id}`, '🔄', () => {
        void this.runAudit();
      })
      .addClass(Constants.AUDIT.CLASSES.SECTION_REFRESH);

    this.setRefreshButtonState($refresh, !this.running);
    $refresh.appendTo($header);

    return $header;
  }

  /**
   * Build body with ticker buttons or success message
   */
  private buildBody(): JQuery {
    const $body = $('<div>').addClass(Constants.AUDIT.CLASSES.SECTION_BODY);

    if (this.results.length === 0) {
      // Success state - no issues
      $('<span>').addClass('audit-no-issues').html('✓ No issues found').appendTo($body);
      return $body;
    }

    // Clamp currentPage to valid range after results change
    const totalPages = this.getTotalPages();
    if (this.currentPage >= totalPages) {
      this.currentPage = Math.max(0, totalPages - 1);
    }
    const displayResults = this.getPaginatedResults();

    // Add buttons
    displayResults.forEach((result) => {
      this.buildTickerButton(result).appendTo($body);
    });

    // Add pagination controls if there are multiple pages
    if (totalPages > 1) {
      this.buildPagination($body, totalPages);
    }

    return $body;
  }

  /**
   * Get page size for pagination
   */
  private getPageSize(): number {
    return this.section.limit && this.section.limit > 0 ? this.section.limit : this.results.length;
  }

  /**
   * Get total number of pages
   */
  private getTotalPages(): number {
    const pageSize = this.getPageSize();
    return Math.ceil(this.results.length / pageSize);
  }

  /**
   * Get results for current page
   */
  private getPaginatedResults(): AuditResult[] {
    const pageSize = this.getPageSize();
    const startIndex = this.currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, this.results.length);
    return this.results.slice(startIndex, endIndex);
  }

  /**
   * Build pagination controls for navigating results
   */
  private buildPagination($body: JQuery, totalPages: number): void {
    const $pagination = $('<div>').addClass('audit-pagination');

    // Previous button
    const $prev = this.uiUtil
      .buildButton(`audit-prev-${this.section.id}`, '← Prev', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          void this.refresh();
        }
      })
      .addClass('audit-pagination-btn')
      .prop('disabled', this.currentPage === 0);

    $prev.appendTo($pagination);

    // Page indicator
    const pageText = `Page ${this.currentPage + 1} of ${totalPages} (${this.results.length} total)`;
    $('<span>').addClass('audit-pagination-text').html(pageText).appendTo($pagination);

    // Next button
    const $next = this.uiUtil
      .buildButton(`audit-next-${this.section.id}`, 'Next →', () => {
        if (this.currentPage < totalPages - 1) {
          this.currentPage++;
          void this.refresh();
        }
      })
      .addClass('audit-pagination-btn')
      .prop('disabled', this.currentPage === totalPages - 1);

    $next.appendTo($pagination);

    $pagination.appendTo($body);
  }

  /**
   * Build a single ticker button with interactions
   */
  private buildTickerButton(result: AuditResult): JQuery {
    const ticker = result.target;
    const buttonId = `audit-${this.section.id}-${ticker}`.replace(/[^a-zA-Z0-9-_]/g, '-');

    // Get button color from section's mapper (always available)
    const buttonColor = this.section.buttonColorMapper(result, this.section.context);

    const $button = this.uiUtil
      .buildButton(buttonId, ticker)
      .addClass('audit-ticker-button')
      .css({
        'background-color': buttonColor,
        margin: '2px',
      })
      .attr(
        'title',
        // FIXME: Remove hardcode vary by actual action of section for all Sections.
        `Left: ${this.section.onLeftClick.name || 'Open'} | Right: ${this.section.onRightClick.name || 'Fix'}`
      );

    // Left-click: Primary action (no auto-refresh on left-click, user may just be viewing)
    $button.on('click', (e) => {
      e.preventDefault();
      void Promise.resolve(this.section.onLeftClick(result));
    });

    // Right-click: Secondary action (no auto-refresh for speed)
    $button.on('contextmenu', (e) => {
      e.preventDefault();
      void Promise.resolve(this.section.onRightClick(result)).then((returnValue) => {
        if (returnValue === false) {
          return;
        }
        $button.remove();
        this.removeResultAndUpdateHeader(ticker);
      });
    });

    // Middle-click: Optional action
    if (this.section.onMiddleClick) {
      $button.on('mousedown', (e) => {
        if (e.which === 2) {
          e.preventDefault();
          void Promise.resolve(this.section.onMiddleClick!(result));
        }
      });
    }

    return $button;
  }

  /**
   * Toggle header expansion
   */
  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    const $body = $(`#audit-section-${this.section.id} .audit-section-body`);

    if (this.collapsed) {
      $body.slideUp(200);
    } else {
      $body.slideDown(200);
    }

    // Update icon
    const $header = $(`#audit-section-${this.section.id} .audit-section-header`);
    const newIcon = this.collapsed ? '►' : '▼';
    $header.find('.header-icon').html(newIcon);
  }

  /**
   * Get timestamp in HH:mm format when audit ran
   */
  private getTimestampText(): string {
    const date = new Date(this.lastRunTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Run the audit plugin to get latest results
   */
  private async runAudit(): Promise<void> {
    try {
      this.running = true;
      const $refresh = $(`#audit-refresh-${this.section.id}`);
      this.setRefreshButtonState($refresh, false);

      // Run plugin
      this.results = await this.section.plugin.run();

      // Record timestamp
      this.lastRunTime = Date.now();

      // Rebuild section
      this.updateSectionInDOM();
    } finally {
      this.running = false;
      const $refresh = $(`#audit-refresh-${this.section.id}`);
      this.setRefreshButtonState($refresh, true);
    }
  }

  /**
   * Handle "Fix All" workflow with confirmation before executing bulk action
   */
  private async handleFixAll(): Promise<void> {
    if (!this.section.onFixAll || this.results.length === 0) {
      return;
    }

    const confirmed = this.uiUtil.showConfirm(
      `Fix All: ${this.section.title}`,
      `This will apply the fix action to all ${this.results.length} item(s).`
    );

    if (!confirmed) {
      return;
    }

    await Promise.resolve(this.section.onFixAll(this.results));
    await this.refresh();
  }

  /**
   * Manually update results (for external data sources)
   */
  public setResults(results: AuditResult[]): void {
    this.results = results;
    this.updateSectionInDOM();
  }

  /**
   * Get current results
   */
  public getResults(): AuditResult[] {
    return this.results;
  }

  /**
   * Remove a result from the list and update header count
   * Used for fast right-click removal without full refresh
   * @private
   */
  private removeResultAndUpdateHeader(ticker: string): void {
    // Remove from results array
    this.results = this.results.filter((r) => r.target !== ticker);

    // Update just the header text (not full section rebuild)
    const headerText = this.section.headerFormatter(this.results, this.section.context);
    const fullHeaderText = `${headerText} - ${this.getTimestampText()}`;

    const $headerText = $(`#audit-section-${this.section.id} .${Constants.AUDIT.CLASSES.HEADER_TEXT}`);
    $headerText.html(fullHeaderText);
  }
}
