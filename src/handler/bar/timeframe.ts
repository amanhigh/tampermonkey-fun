import { BaseBar, IBaseBar } from './base';
import { BarId, BarStatus } from '../../models/bar';
import { DomainEventType } from '../../models/domain_event';
import { TickerTimeframe } from '../../models/timeframe';
import { ITimeFrameManager } from '../../manager/timeframe';
import { IBarkatManager } from '../../manager/barkat';
import { IDomManager } from '../../manager/dom';
import {
  BARKAT_METRIC_KEYS,
  BarkatMetricKey,
  BarkatStatus,
  BarkatTimeframeAnalysis,
  BARKAT_TIMEFRAMES,
} from '../../models/barkat';
import { escapeHtml } from '../../util/html';
import { Notifier } from '../../util/notify';

// ── Module Constants ──

/** Emoji prefix displayed before the timeframe chips. */
const EMOJI_TIMEFRAMES = '\u{1F9ED}';

/** Existing click affordance hint shown at the end of every chip tooltip. */
const CLICK_HINT = 'Click to add/remove.';

/** Brief, non-predictive suitability disclaimer. */
const SUITABILITY_DISCLAIMER = 'History-based suitability, not a forecast.';

/** Namespaced jQuery event namespace for delegated bindings on this bar. */
const EVENT_NS = 'bar-tf';

/** Human labels for the three Barkat metrics, in canonical order. */
const METRIC_LABELS: Record<BarkatMetricKey, string> = {
  zone_failures: 'Zone failures',
  strategy_wins: 'Strategy wins',
  strategy_entries: 'Strategy entries',
};

/** Preferred-reading label per Barkat status. */
const STATUS_LABEL: Record<BarkatStatus, string> = {
  pass: 'pass (preferred)',
  warning: 'warning (not preferred)',
  fail: 'fail (not preferred)',
};

/** Corner badge glyph for a selection/verdict mismatch. */
const MISMATCH_GLYPH = '\u2260';

/** Latest-wins analysis state rendered by the bar. */
type AnalysisState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly rows: ReadonlyMap<TickerTimeframe, BarkatTimeframeAnalysis> };

/**
 * Interface for the timeframe bar presentation component.
 * Renders clickable timeframe chips and handles toggle interactions.
 *
 * Preserves the existing exported type name as a type alias to {@link IBaseBar}.
 */
export type ITimeFrameHandler = IBaseBar;

/**
 * Timeframe bar below the display card.
 *
 * Shows all six possible timeframe codes as clickable chips.
 * Active chips (those in the backend ticker.timeframes) are colored;
 * inactive chips are muted. Clicking toggles the code on/off in the backend.
 *
 * Barkat analysis is a secondary, read-only overlay: chips paint from the
 * selection load alone, then corner badges and hover/focus tooltips are added
 * when the analysis resolves. Analysis failure is quiet (no notifications).
 *
 * Compact-only: does not override {@link renderDetails} so BaseBar renders
 * compact content directly without disclosure shell.
 *
 * Listens to TICKER_CHANGED (ticker switch) and TICKER_TIMEFRAMES_CHANGED
 * (toggle result) to re-render when state changes.
 */
export class TimeFrameBar extends BaseBar<readonly TickerTimeframe[]> implements ITimeFrameHandler {
  /** Prevents concurrent toggle operations. */
  private toggling = false;

  /** Monotonic revision guarding both selection and analysis paints. */
  private refreshRevision = 0;

  /** Active codes from the latest selection load, retained for analysis repaints. */
  private activeCodes: readonly TickerTimeframe[] = [];

  /** Analysis overlay state for the latest refresh. */
  private analysis: AnalysisState = { kind: 'loading' };

  /** Whether an earlier successful paint exists (drives overlay clearing). */
  private hasPainted = false;

  constructor(
    private readonly timeFrameManager: ITimeFrameManager,
    private readonly barkatManager: IBarkatManager,
    private readonly domManager: IDomManager
  ) {
    super(BarId.TIMEFRAME);
  }

  // ── Event/data contracts ──

  /** @inheritdoc */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [DomainEventType.TICKER_CHANGED, DomainEventType.TICKER_TIMEFRAMES_CHANGED];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<readonly TickerTimeframe[]> {
    return this.timeFrameManager.getActiveTimeframes();
  }

  /** @inheritdoc */
  protected resolveStatus(data: readonly TickerTimeframe[]): BarStatus {
    if (data.length < 3) {
      return BarStatus.ERROR;
    }
    const hasYr = data.includes(TickerTimeframe.YR);
    return hasYr ? BarStatus.OK : BarStatus.WARN;
  }

  // ── Refresh ──

  /**
   * Latest-wins refresh that starts selection and analysis loads together.
   * Paint order: retained actives without overlay → selection only → analysis overlay.
   * Stale revisions never paint.
   */
  public override async refresh(): Promise<void> {
    const revision = ++this.refreshRevision;
    const ticker = this.domManager.getTicker();

    // Drop the previous overlay immediately so stale badges and tooltip content
    // are not displayed while fresh selections load.
    this.analysis = { kind: 'loading' };
    if (this.hasPainted) {
      this.repaintPreservingFocus();
    }

    const selectionPromise = this.loadData();
    const analysisPromise = this.barkatManager.getTickerAnalysis(ticker).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const })
    );

    const active = await selectionPromise;
    if (revision !== this.refreshRevision) {
      return;
    }
    this.activeCodes = active;
    this.hasPainted = true;
    this.render(active);

    const settled = await analysisPromise;
    if (revision !== this.refreshRevision) {
      return;
    }
    this.analysis = settled.ok
      ? { kind: 'ready', rows: new Map(settled.value.timeframes.map((row) => [row.timeframe, row])) }
      : { kind: 'unavailable' };
    this.repaintPreservingFocus();
  }

  // ── Rendering ──

  /** @inheritdoc */
  protected renderCompact(data: readonly TickerTimeframe[]): string {
    const activeSet = new Set(data);
    const chipsHtml = this.buildChipsHtml(activeSet);
    return `${EMOJI_TIMEFRAMES} ${chipsHtml}`;
  }

  // ── Post-paint hook — delegated chip bindings ──

  /** @inheritdoc */
  protected onPaint($root: JQuery, _data: readonly TickerTimeframe[]): void {
    this.bindChipClicks($root);
    this.bindTooltipInteractions($root);
  }

  // ── Binding ──

  /**
   * Binds delegated chip click handler with namespaced off/on deduplication.
   * @param $root - jQuery-wrapped bar root element
   */
  private bindChipClicks($root: JQuery): void {
    const chipSelector = `.${this.bemElement('chip')}`;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $root.off(`click.${EVENT_NS}`, chipSelector).on(`click.${EVENT_NS}`, chipSelector, (e) => {
      e.stopPropagation();
      void this.handleChipClick($(e.currentTarget));
    });
  }

  /**
   * Binds tooltip re-show and Escape dismissal handlers (namespaced, deduplicated).
   * Neither handler can trigger a timeframe toggle.
   * @param $root - jQuery-wrapped bar root element
   */
  private bindTooltipInteractions($root: JQuery): void {
    const chipSelector = `.${this.bemElement('chip')}`;
    const itemSelector = `.${this.bemElement('item')}`;
    const dismissedModifier = this.bemElementModifier('item', 'tip-dismissed');

    const restoreTip = (e: JQuery.TriggeredEvent): void => {
      $(e.currentTarget).removeClass(dismissedModifier);
    };

    $root
      .off(`mouseenter.${EVENT_NS}`, itemSelector)
      .on(`mouseenter.${EVENT_NS}`, itemSelector, restoreTip)
      .off(`focusin.${EVENT_NS}`, itemSelector)
      .on(`focusin.${EVENT_NS}`, itemSelector, restoreTip)
      .off(`keydown.${EVENT_NS}`, chipSelector)
      .on(`keydown.${EVENT_NS}`, chipSelector, (e: JQuery.KeyDownEvent) => {
        if (e.key !== 'Escape') {
          return;
        }
        e.stopPropagation();
        $(e.currentTarget).closest(itemSelector).addClass(dismissedModifier);
      });
  }

  // ── Toggle Workflow ──

  /**
   * Handles click on a timeframe chip.
   * Toggles the timeframe code in the backend via TimeFrameManager,
   * then re-renders the bar on failure (successful toggle triggers
   * a domain event that also calls refresh).
   * @param $chip - The clicked chip element
   */
  private async handleChipClick($chip: JQuery): Promise<void> {
    const code = $chip.attr(this.bemDataAttr('code')) as TickerTimeframe | undefined;
    if (!code) {
      return;
    }

    if (this.toggling) {
      return;
    }
    this.toggling = true;

    // Add loading state
    $chip.addClass(this.bemElementModifier('chip', 'loading'));

    try {
      // Successful toggle publishes TICKER_TIMEFRAMES_CHANGED -> event handler calls refresh()
      await this.timeFrameManager.toggleTimeframe(code);
    } catch (error) {
      Notifier.warn(`Failed to toggle timeframe ${code}: ${(error as Error).message}`);
      // Re-render to restore actual backend state (no event published on failure)
      await this.refresh();
    } finally {
      this.toggling = false;
    }
  }

  // ── Focus preservation ──

  /**
   * Repaints the current selection with the latest analysis overlay while
   * restoring focus to the same chip when this bar owned it.
   */
  private repaintPreservingFocus(): void {
    const focusedCode = this.captureFocusedChipCode();
    this.render(this.activeCodes);
    if (focusedCode !== undefined) {
      this.restoreChipFocus(focusedCode);
    }
  }

  /**
   * @returns code of the chip holding focus inside this bar, if any
   */
  private captureFocusedChipCode(): TickerTimeframe | undefined {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const active = document.activeElement as HTMLElement | null;
    if (!active || !active.classList.contains(this.bemElement('chip'))) {
      return undefined;
    }
    return (active.getAttribute(this.bemDataAttr('code')) as TickerTimeframe | null) ?? undefined;
  }

  /**
   * Focuses the chip for the given code when it exists.
   * @param code - Timeframe code to refocus
   */
  private restoreChipFocus(code: TickerTimeframe): void {
    const selector = `#${this.blockClass} .${this.bemElement('chip')}[${this.bemDataAttr('code')}="${code}"]`;
    document.querySelector<HTMLElement>(selector)?.focus();
  }

  // ── Markup Builders ──

  /**
   * Builds the inner HTML for all six timeframe chips in display order.
   * @param activeSet - Set of backend-active timeframe codes
   */
  private buildChipsHtml(activeSet: Set<TickerTimeframe>): string {
    // All timeframe codes in catalog order — enum values match static catalog order
    const allCodes = Object.values(TickerTimeframe);
    return allCodes.map((code) => this.buildChip(code, activeSet.has(code))).join('');
  }

  /**
   * Builds one chip item: a button chip plus its linked tooltip.
   * Badges and tooltips are absolutely positioned overlays, so the row keeps
   * its original width and height.
   * @param code - Timeframe code (YR, SMN, etc.)
   * @param isActive - Whether this chip is currently active in the backend
   */
  private buildChip(code: TickerTimeframe, isActive: boolean): string {
    const chipClass = this.bemElement('chip');
    const stateClass = isActive
      ? this.bemElementModifier('chip', 'active')
      : this.bemElementModifier('chip', 'inactive');
    const codeAttr = this.bemDataAttr('code');
    const analysedAttr = this.bemDataAttr('barkat');
    const tipId = this.bemChildId(`tip-${code}`);
    const badge = this.buildBadge(code, isActive);
    const analysedState = this.analysisKind(code);

    return [
      `<span class="${this.bemElement('item')}">`,
      `<button type="button" class="${chipClass} ${stateClass}" ${codeAttr}="${code}" `,
      `aria-pressed="${isActive ? 'true' : 'false'}" aria-describedby="${tipId}" `,
      `${analysedAttr}="${analysedState}">${code}${badge}</button>`,
      this.buildTip(code, isActive, tipId),
      `</span>`,
    ].join('');
  }

  /**
   * Builds the corner badge for a chip, or an empty string when none applies.
   * Badge appears only when the retained row's verdict differs from the
   * effective selection (`active !== (status === 'pass')`).
   * @param code - Timeframe code
   * @param isActive - Whether the user has the timeframe selected
   */
  private buildBadge(code: TickerTimeframe, isActive: boolean): string {
    if (this.analysis.kind !== 'ready') {
      return '';
    }
    const row = this.analysis.rows.get(code);
    if (!row || isActive === (row.status === 'pass')) {
      return '';
    }
    return `<span class="${this.bemElement('badge')}" ${this.bemDataAttr('badge')}="mismatch" aria-hidden="true">${MISMATCH_GLYPH}</span>`;
  }

  /**
   * @param code - Timeframe code
   * @returns whether the Barkat API assesses this timeframe (SMN/TMN/MN/WK)
   */
  private isAssessed(code: TickerTimeframe): boolean {
    return (BARKAT_TIMEFRAMES as readonly string[]).includes(code);
  }

  /**
   * @param code - Timeframe code
   * @returns analysis state name exposed on the chip for styling and tests
   */
  private analysisKind(code: TickerTimeframe): 'loading' | 'unavailable' | 'unassessed' | BarkatStatus {
    if (!this.isAssessed(code)) {
      return 'unassessed';
    }
    if (this.analysis.kind !== 'ready') {
      return this.analysis.kind;
    }
    return this.analysis.rows.get(code)?.status ?? 'unassessed';
  }

  /**
   * Builds the linked `role="tooltip"` element for a chip.
   * @param code - Timeframe code
   * @param isActive - Whether the user has the timeframe selected
   * @param tipId - Element id referenced by the chip's aria-describedby
   */
  private buildTip(code: TickerTimeframe, isActive: boolean, tipId: string): string {
    const lines = [
      `<span class="${this.bemElement('tip-line')}">Your selection: ${isActive ? 'selected' : 'not selected'}</span>`,
      ...this.buildAnalysisLines(code),
      `<span class="${this.bemElement('tip-line')}">${escapeHtml(SUITABILITY_DISCLAIMER)}</span>`,
      `<span class="${this.bemElement('tip-line')}">${escapeHtml(CLICK_HINT)}</span>`,
    ];
    return `<span id="${tipId}" role="tooltip" class="${this.bemElement('tip')}">${lines.join('')}</span>`;
  }

  /**
   * Builds the analysis portion of a tooltip.
   * @param code - Timeframe code
   * @returns tooltip line markup for the current analysis state
   */
  private buildAnalysisLines(code: TickerTimeframe): string[] {
    if (!this.isAssessed(code)) {
      return [this.tipLine(`Barkat analysis: ${code} not assessed`)];
    }
    if (this.analysis.kind === 'loading') {
      return [this.tipLine('Barkat analysis: loading…')];
    }
    if (this.analysis.kind === 'unavailable') {
      return [this.tipLine('Barkat analysis: unavailable')];
    }
    const row = this.analysis.rows.get(code);
    if (!row) {
      return [this.tipLine('Barkat analysis: not assessed for this timeframe')];
    }

    const attention = row.status !== 'pass';
    return [
      this.tipLine(`Barkat: ${escapeHtml(STATUS_LABEL[row.status])}`, attention),
      ...BARKAT_METRIC_KEYS.map((key) => this.buildMetricLine(key, row)),
    ];
  }

  /**
   * Builds one named metric line with its percentage (em dash when null)
   * and the supplied metric status. Non-pass metrics are emphasised.
   * @param key - Metric key
   * @param row - Barkat row for the current timeframe
   */
  private buildMetricLine(key: BarkatMetricKey, row: BarkatTimeframeAnalysis): string {
    const metric = row.metrics[key];
    const value = metric.percentage === null ? '\u2014' : `${metric.percentage}%`;
    const label = `${escapeHtml(METRIC_LABELS[key])}: ${value} (${escapeHtml(metric.status)})`;
    return this.tipLine(label, metric.status !== 'pass');
  }

  /**
   * @param html - Trusted markup for the line
   * @param attention - Whether the line should be visually emphasised
   */
  private tipLine(html: string, attention = false): string {
    const modifier = attention ? ` ${this.bemElementModifier('tip-line', 'attention')}` : '';
    return `<span class="${this.bemElement('tip-line')}${modifier}">${html}</span>`;
  }
}
