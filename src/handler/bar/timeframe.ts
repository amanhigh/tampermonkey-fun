import { BaseBar, IBaseBar } from './base';
import { BarId, BarStatus } from '../../models/bar';
import { DomainEventType } from '../../models/domain_event';
import { TickerTimeframe } from '../../models/timeframe';
import { ITimeFrameManager } from '../../manager/timeframe';
import { IBarkatManager } from '../../manager/barkat';
import { IDomManager } from '../../manager/dom';
import { escapeHtml } from '../../util/html';
import { Notifier } from '../../util/notify';

// ── Module Constants ──

/** Emoji prefix displayed before the timeframe chips. */
const EMOJI_TIMEFRAMES = '\u{1F9ED}';

/** Generic click affordance hint used as the native chip tooltip. */
const CLICK_HINT = 'Click to add/remove.';

/** Native tooltip for a selected chip whose Barkat verdict is not preferred. */
const TITLE_SELECTED_NOT_PREFERRED = 'Selected \u00B7 Barkat: not preferred. Click to remove.';

/** Native tooltip for an unselected chip whose Barkat verdict is preferred. */
const TITLE_UNSELECTED_PREFERRED = 'Not selected \u00B7 Barkat: preferred. Click to add.';

/** Namespaced jQuery event namespace for delegated bindings on this bar. */
const EVENT_NS = 'bar-tf';

/** Corner badge glyph for a selection/verdict mismatch. */
const MISMATCH_GLYPH = '\u2260';

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
 * selection load alone, then a corner badge and a native `title` hint are added
 * when the analysis resolves. Full analysis detail lives in the side panel, so
 * no metric-level markup is rendered here. Analysis failure is quiet
 * (no notifications).
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

  /**
   * Active codes from the latest selection load, retained for analysis repaints.
   * `undefined` until the first selection paints; an empty array is a valid state.
   */
  private activeCodes?: readonly TickerTimeframe[];

  /**
   * Supported timeframe → whether Barkat prefers it (`status === 'pass'`).
   * `undefined` while the analysis is pending or unavailable. A missing key
   * means the timeframe is unassessed and must be kept distinct from `false`.
   */
  private analysis?: ReadonlyMap<TickerTimeframe, boolean>;

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

    // Drop the previous overlay immediately so stale badges and titles are not
    // displayed while fresh selections load.
    this.analysis = undefined;
    this.repaintPreservingFocus();

    const selectionPromise = this.loadData();
    const analysisPromise = this.barkatManager.getTickerAnalysis(ticker).then(
      (value) =>
        new Map<TickerTimeframe, boolean>(value.timeframes.map((row) => [row.timeframe, row.status === 'pass'])),
      () => undefined
    );

    const active = await selectionPromise;
    if (revision !== this.refreshRevision) {
      return;
    }
    this.activeCodes = active;
    this.render(active);

    const preferredByCode = await analysisPromise;
    if (revision !== this.refreshRevision) {
      return;
    }
    this.analysis = preferredByCode;
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
   * Repaints the retained selection with the latest analysis overlay while
   * restoring focus to the same chip when this bar owned it.
   * No-op until a selection has painted (`activeCodes === undefined`).
   */
  private repaintPreservingFocus(): void {
    const codes = this.activeCodes;
    if (codes === undefined) {
      return;
    }
    const focusedCode = this.captureFocusedChipCode();
    this.render(codes);
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
   * Builds one chip button with its escaped native tooltip.
   * The mismatch badge is an absolutely positioned overlay, so the row keeps
   * its original width and height.
   *
   * Mismatch is derived once here: an assessed timeframe (`preferred` defined)
   * always mismatches when its preference disagrees with the selection, and
   * drives both the native title and the corner badge.
   * @param code - Timeframe code (YR, SMN, etc.)
   * @param isActive - Whether this chip is currently active in the backend
   */
  private buildChip(code: TickerTimeframe, isActive: boolean): string {
    const chipClass = this.bemElement('chip');
    const stateClass = isActive
      ? this.bemElementModifier('chip', 'active')
      : this.bemElementModifier('chip', 'inactive');
    const codeAttr = this.bemDataAttr('code');
    const preferred = this.analysis?.get(code);
    const mismatch = preferred !== undefined && isActive !== preferred;

    let title = CLICK_HINT;
    if (mismatch) {
      title = isActive ? TITLE_SELECTED_NOT_PREFERRED : TITLE_UNSELECTED_PREFERRED;
    }
    const badge = mismatch
      ? `<span class="${this.bemElement('badge')}" ${this.bemDataAttr('badge')}="mismatch" aria-hidden="true">${MISMATCH_GLYPH}</span>`
      : '';

    return [
      `<button type="button" class="${chipClass} ${stateClass}" ${codeAttr}="${code}" `,
      `aria-pressed="${isActive ? 'true' : 'false'}" title="${escapeHtml(title)}">`,
      `${code}${badge}</button>`,
    ].join('');
  }
}
