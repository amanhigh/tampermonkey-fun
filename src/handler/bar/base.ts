import { IDomainEventConsumer, ISubscriber } from '../../manager/event_bus';
import { DomainEventType } from '../../models/barkat/domain_event';
import {
  BAR_CLASS,
  BAR_INDICATOR_BADGE_CLASS,
  BAR_INDICATORS_CLASS,
  BarId,
  BarIndicatorState,
  BarIndicatorUpdate,
  BarStatus,
} from '../../models/presentation/bar';
import { escapeHtml } from '../../util/html';

/** Accessible labels for the shared optional-indicator marker. */
const INDICATORS_LOADING_LABEL = 'Loading indicators';
const INDICATORS_UNAVAILABLE_LABEL = 'Indicators unavailable';

/**
 * Contract for bar-style UI components: compact/expanded content lifecycle,
 * domain-event refresh, and optional post-mandatory indicators.
 *
 * Extends {@link IDomainEventConsumer} so bars can register refresh
 * subscriptions that trigger an automatic refresh. Consumers only see
 * {@link IBaseBar.refresh} and {@link IDomainEventConsumer.registerEvents};
 * rendering is internal and driven by the protected lifecycle below.
 *
 * ## BEM Contract
 *
 * The block class is the {@link BarId} value itself (e.g. `aman-alert-ticker-bar`),
 * so every class, child id, and data attribute is scoped to that one bar.
 *
 * | Helper                | Pattern                              | Example                                  |
 * |-----------------------|--------------------------------------|------------------------------------------|
 * | `blockClass`          | `{barId}`                            | `aman-alert-ticker-bar`                  |
 * | `bemElement(el)`      | `{block}__{el}`                      | `aman-alert-ticker-bar__row`             |
 * | `bemModifier(mod)`    | `{block}--{mod}`                     | `aman-alert-ticker-bar--expanded`        |
 * | `bemElementModifier`  | `{block}__{el}--{mod}`               | `aman-alert-ticker-bar__row--active`     |
 * | `bemChildId(name)`    | `{block}-{name}`                     | `aman-alert-ticker-bar-count`            |
 * | `bemDataAttr(name)`   | `data-{ns}-{name}`                   | `data-alert-ticker-symbol`               |
 *
 * Namespace (`ns`) strips a leading `aman-` and trailing `-bar` from the
 * {@link BarId} value (`aman-alert-ticker-bar` → `alert-ticker`). The event
 * namespace is `bar-{ns}` (`bar-alert-ticker`) for `click` and `contextmenu`
 * bindings, so handlers for distinct bars never collide.
 *
 * ## Lifecycle Ordering
 *
 * 1. **`render(data)`** — (protected) stores data, resets expanded and indicator
 *    presentation (`READY`/`[]`), calls `paint(true)`, and invalidates in-flight `refresh()`.
 * 2. **`paint(bindHandlers)`** — queries root, renders the disclosure shell (or compact
 *    content when `renderDetails` is `null`), syncs root/status/expanded state, binds
 *    handlers on full paint, re-applies retained indicators, then calls `onPaint()`.
 * 3. **`toggle()`** — flips expanded and repaints without rebinding handlers.
 * 4. **`onLeftClick(event)`** — defaults to `toggle()`; overrides replace unless `super` is called.
 * 5. **`onRightClick(event, data)`** / **`onPaint($root, data)`** — protected hooks.
 * 6. **`refresh()`** — latest-request-wins: increments revision, clears root (empty bars stay
 *    hidden via CSS) with indicators `READY`, awaits `loadData()`, then — when the revision is
 *    still current — resolves data-dependent eligibility through
 *    {@link BaseBar.shouldLoadIndicators}, marks `LOADING` only for eligible data *before* the
 *    mandatory paint, paints mandatory content, and awaits `loadIndicators()` for eligible data
 *    only. The mandatory paint does not bump the revision, so one revision guards both phases;
 *    an explicit `render()` still invalidates pending work.
 *
 * @see {@link BaseBar} — expansion contract and handler-binding details.
 */
export interface IBaseBar extends IDomainEventConsumer {
  /** Fetch fresh data via `loadData()` and re-render (latest-request-wins). */
  refresh(): Promise<void>;
}

/**
 * Generic abstract base for bar-style UI components.
 *
 * @template TData The data type rendered by the bar.
 * @see {@link IBaseBar} — authoritative lifecycle and BEM contract.
 *
 * ## Expansion Contract
 *
 * {@link renderDetails} selects the rendering mode on every paint:
 *
 * - **Return `null`** (default) — *compact-only*. `renderCompact(data)` becomes the
 *   entire root content: no toggle button, no details container, and no expanded
 *   mode. The expanded modifier is still synchronized on every paint, so
 *   `syncExpandedModifier` removes it instead of skipping it. Context-menu binding
 *   still applies when the compact markup contains `[data-{ns}-context-action]` targets.
 * - **Return `string`** — *expandable*. `BaseBar` owns the disclosure shell
 *   (`<button class="{block}__toggle" aria-expanded aria-controls>` plus a hidden
 *   `<div id="{block}-details" class="{block}__details">`) and the expanded modifier.
 *   Subclasses supply only the inner HTML: compact markup as the button face and
 *   details markup for the container, never the shell itself.
 *
 * ## Handler Binding
 *
 * - **Click** (expandable mode only) — delegated to `.{block}__toggle` via
 *   `off('click.{ns}', sel).on('click.{ns}', sel, …)`; the native `<button>`
 *   provides Enter/Space activation, so no key handlers are needed. Calls
 *   {@link onLeftClick}, whose default toggles.
 * - **Context-menu** (both modes) — delegated to the generated
 *   `[data-{ns}-context-action]` selector, calls `preventDefault` +
 *   `stopPropagation`, then {@link onRightClick}. Rejected thenables and sync
 *   errors are caught to avoid unhandled rejections.
 * - **Deduplication** — a full paint always calls `off()` before `on()` for the
 *   same namespaced event and selector, so repeated renders never stack handlers.
 *   Toggle repaints pass `bindHandlers = false` and never rebind.
 * - **Hook order per paint** — HTML render → root/status classes → expanded
 *   modifier → handler binding (full paint only) → retained indicators →
 *   {@link onPaint} last.
 */
export abstract class BaseBar<TData> implements IBaseBar {
  /** The BarId value used as the block class and root selector basis. */
  private readonly barId: BarId;

  /** Derived namespace: `aman-` prefix and `-bar` suffix stripped from BarId. */
  private readonly namespace: string;

  /** jQuery event namespace: `bar-{ns}` used for click and contextmenu bindings. */
  private readonly eventNs: string;

  /** Whether the bar is currently in expanded mode. */
  private expanded = false;

  /** Retained data from the most recent render call. */
  private currentData?: TData;

  /** Monotonic revision counter for latest-request-wins refresh sequencing. */
  private loadRevision = 0;

  /** Lifecycle state of the optional indicators; only a real optional failure marks it unavailable. */
  private indicatorState: BarIndicatorState = BarIndicatorState.READY;

  /** Retained indicator updates, re-applied on every paint without refetching. */
  private indicators: readonly BarIndicatorUpdate[] = [];

  /** @param barId The {@link BarId} enum value for this bar instance. */
  constructor(barId: BarId) {
    this.barId = barId;

    // Derive namespace: strip leading 'aman-' and trailing '-bar'
    let ns: string = barId;
    if (ns.startsWith('aman-')) {
      ns = ns.slice(5);
    }
    if (ns.endsWith('-bar')) {
      ns = ns.slice(0, -4);
    }
    this.namespace = ns;

    this.eventNs = `bar-${this.namespace}`;
  }

  // ── BEM helpers ──

  /**
   * The BEM block class — equals the {@link BarId} value.
   *
   * @example
   * // For BarId.ALERT ('aman-alert-ticker-bar')
   * this.blockClass // 'aman-alert-ticker-bar'
   */
  protected get blockClass(): string {
    return this.barId;
  }

  /**
   * Generate a BEM element class.
   *
   * @param element Element name.
   * @returns `{block}__{element}`
   */
  protected bemElement(element: string): string {
    return `${this.blockClass}__${element}`;
  }

  /**
   * Generate a BEM modifier class.
   *
   * @param modifier Modifier name.
   * @returns `{block}--{modifier}`
   */
  protected bemModifier(modifier: string): string {
    return `${this.blockClass}--${modifier}`;
  }

  /**
   * Generate a BEM element-modifier class.
   *
   * @param element Element name.
   * @param modifier Modifier name.
   * @returns `{block}__{element}--{modifier}`
   */
  protected bemElementModifier(element: string, modifier: string): string {
    return `${this.blockClass}__${element}--${modifier}`;
  }

  /**
   * Generate a child element id.
   *
   * @param name Child name.
   * @returns `{block}-{name}`
   */
  protected bemChildId(name: string): string {
    return `${this.blockClass}-${name}`;
  }

  /**
   * Generate a namespaced data-attribute name.
   *
   * @param name Attribute name, without `data-` prefix or namespace.
   * @returns `data-{ns}-{name}`
   *
   * @example
   * // For BarId.ALERT (namespace = 'alert-ticker')
   * this.bemDataAttr('symbol')         // 'data-alert-ticker-symbol'
   * this.bemDataAttr('context-action') // 'data-alert-ticker-context-action'
   */
  protected bemDataAttr(name: string): string {
    return `data-${this.namespace}-${name}`;
  }

  // ── Protected data application ──

  /**
   * Apply fresh data, reset expanded state, and fully paint. Invalidates any in-flight
   * `refresh()` (pending indicators included) and resets indicators to `READY`/`[]`, so
   * explicit data never keeps a spinner or an earlier refresh's badges.
   *
   * @param data The data to render.
   */
  protected render(data: TData): void {
    ++this.loadRevision;
    this.indicators = [];
    this.indicatorState = BarIndicatorState.READY;
    this.applyMandatoryData(data);
  }

  /** Paint mandatory data without touching the revision or indicator state. */
  private applyMandatoryData(data: TData): void {
    this.currentData = data;
    this.expanded = false;
    this.paint(true);
  }

  /** @inheritdoc */
  public async refresh(): Promise<void> {
    const revision = ++this.loadRevision;

    // Drop the previous indicator overlay so stale decorations never repaint
    this.indicators = [];
    this.indicatorState = BarIndicatorState.READY;

    // Clear first: an empty bar stays hidden via CSS until mandatory data lands
    const $root = $(`#${this.barId}`);
    if ($root.length > 0) {
      $root.html('');
    }

    // Mandatory data: errors propagate and leave the bar empty (hidden)
    const data = await this.loadData();
    if (revision !== this.loadRevision) {
      return;
    }

    // Eligibility is derived from this request's data only, so concurrent requests
    // never share state; the marker is raised before the mandatory paint.
    const withIndicators = this.shouldLoadIndicators(data);
    if (withIndicators) {
      this.indicatorState = BarIndicatorState.LOADING;
    }

    // Paint with the intended indicator state intact (no revision bump here)
    this.applyMandatoryData(data);
    if (!withIndicators) {
      return;
    }

    let state = BarIndicatorState.READY;
    let updates: readonly BarIndicatorUpdate[] = [];
    try {
      updates = await this.loadIndicators(data);
    } catch {
      // Optional indicators fail quietly; mandatory content stays as painted
      state = BarIndicatorState.UNAVAILABLE;
    }

    if (revision !== this.loadRevision) {
      return;
    }

    this.indicators = updates;
    this.indicatorState = state;

    const $painted = $(`#${this.barId}`);
    if ($painted.length > 0) {
      this.applyIndicators($painted);
    }
  }

  /** @inheritdoc */
  public registerEvents(subscriber: ISubscriber): void {
    const events = this.refreshEvents;
    if (events.length > 0) {
      subscriber.subscribeMany([...events], async () => {
        await this.refresh();
      });
    }
  }

  // ── Protected abstract contracts ──

  /**
   * Domain event types that trigger a refresh when received.
   * Return an empty array to disable automatic refresh subscriptions.
   */
  protected abstract get refreshEvents(): readonly DomainEventType[];

  /**
   * Load fresh data for this bar. Called by {@link refresh}.
   *
   * @returns The loaded data.
   */
  protected abstract loadData(): Promise<TData>;

  /**
   * Render compact (collapsed) HTML for the given data.
   *
   * Used as the whole root content in compact-only mode, or as the disclosure
   * toggle face in expandable mode.
   *
   * @param data The current data.
   * @returns HTML string for compact mode.
   */
  protected abstract renderCompact(data: TData): string;

  /**
   * Resolve the visual status applied to the root during every paint, as the
   * shared `aman-bar--{status}` modifier (see the BEM contract on {@link IBaseBar}).
   *
   * @param data The current data.
   * @returns The {@link BarStatus} to apply.
   */
  protected abstract resolveStatus(data: TData): BarStatus;

  // ── Optional indicators contract ──

  /**
   * Whether this bar opts into optional indicator loading after mandatory data.
   * Opted-in bars get a small marker, in-place badge/title updates, and a quiet
   * unavailable mark; when `false`, `loadIndicators` is never called.
   */
  protected get supportsIndicators(): boolean {
    return false;
  }

  /**
   * Whether the optional indicator phase should run for this loaded data; called by
   * {@link refresh} after the mandatory load and before the mandatory paint.
   *
   * Defaults to the static {@link supportsIndicators} opt-in. Override to skip the
   * optional phase for data that cannot carry indicators, keeping the opt-in
   * static and the decision data-dependent per request.
   *
   * @param _data The loaded data for this request.
   * @returns `true` to mark `LOADING` and call {@link loadIndicators}; `false` to
   *          paint mandatory content only with indicators left `READY`.
   */
  protected shouldLoadIndicators(_data: TData): boolean {
    return this.supportsIndicators;
  }

  /**
   * Load optional indicator updates for already-rendered mandatory data; called by
   * {@link refresh} only for opted-in bars. A rejection marks indicators unavailable
   * without touching business status.
   *
   * @param _data The current data.
   * @returns Updates to apply in place, or `[]` for none.
   */
  protected async loadIndicators(_data: TData): Promise<readonly BarIndicatorUpdate[]> {
    return await Promise.resolve([]);
  }

  // ── Nullable expansion contract ──

  /**
   * Render expanded detail content, evaluated on every paint to select the mode.
   *
   * Return a string to enable the disclosure shell; return `null` (default) to
   * stay compact-only with `renderCompact(data)` in the root. `BaseBar` composes
   * the shell — subclasses return only the inner content (rows, empty state, …).
   *
   * @param _data The current data.
   * @returns HTML string for expanded detail content, or `null` to disable expansion.
   * @see {@link BaseBar} — authoritative expansion contract.
   */
  protected renderDetails(_data: TData): string | null {
    return null;
  }

  // ── Protected hooks ──

  /**
   * Post-paint hook, called last on every paint — after handlers are bound on a
   * full paint, and after each toggle repaint. Override to apply additional
   * root-level state derived from the current data.
   *
   * @param _$root Root jQuery element.
   * @param _data Current bar data.
   */
  protected onPaint(_$root: JQuery, _data: TData): void {
    // Default no-op
  }

  /**
   * Root disclosure click hook; defaults to {@link toggle}.
   *
   * Overrides replace the toggle unless they call `super.onLeftClick(event)`.
   * Native `<button>` semantics already provide Enter/Space activation.
   *
   * @param _event The jQuery click event.
   */
  protected onLeftClick(_event: JQuery.ClickEvent): void {
    this.toggle();
  }

  /**
   * Delegated contextmenu hook for `[data-{ns}-context-action]` targets.
   * Default is a no-op; see the handler-binding contract on {@link BaseBar}.
   *
   * @param _event The jQuery contextmenu event.
   * @param _data The current bar data.
   */
  protected onRightClick(_event: JQuery.ContextMenuEvent, _data: TData): void | Promise<void> {
    // Default no-op
  }

  // ── Private rendering ──

  /**
   * Unified paint cycle, per {@link IBaseBar} lifecycle ordering and the
   * expansion/handler contract on {@link BaseBar}.
   *
   * Called from {@link render} (`bindHandlers = true`) and from {@link toggle}
   * (`bindHandlers = false`); renders compact content only when
   * {@link renderDetails} returns `null`.
   *
   * @param bindHandlers When true, rebind click/contextmenu via off/on deduplication;
   *                     when false, only update HTML and modifier state (toggle path).
   */
  private paint(bindHandlers: boolean): void {
    const $root = $(`#${this.barId}`);
    const data = this.currentData;

    // Safely return when root selector does not exist
    if ($root.length === 0 || data === undefined) {
      return;
    }

    const detailsHtml = this.renderDetails(data);
    const compactHtml = this.renderCompact(data);

    if (detailsHtml === null) {
      // Compact-only mode; reset so a stale mode switch cannot leak expanded state.
      this.expanded = false;
      $root.html(compactHtml);
    } else {
      // Expandable mode: render disclosure shell with toggle + details container
      const detailsId = this.bemChildId('details');
      const toggleClass = this.bemElement('toggle');
      const detailsClass = this.bemElement('details');
      const expandedAttr = this.expanded ? 'true' : 'false';
      const hiddenAttr = this.expanded ? '' : ' hidden';
      const contentHtml = this.expanded ? detailsHtml : '';

      const html = [
        `<button type="button" class="${toggleClass}" aria-expanded="${expandedAttr}" aria-controls="${detailsId}">${compactHtml}</button>`,
        `<div id="${detailsId}" class="${detailsClass}"${hiddenAttr}>${contentHtml}</div>`,
      ].join('');
      $root.html(html);
    }

    // Synchronize root classes (block + bar) and status modifier
    this.syncRootClasses($root, data);

    // Synchronize expanded modifier (common to both modes)
    this.syncExpandedModifier($root);

    if (bindHandlers) {
      this.bindContextMenu($root, data);
      if (detailsHtml !== null) {
        this.bindClick($root);
      }
    }

    // Re-apply retained indicators so a repaint never drops their presentation
    this.applyIndicators($root);

    this.onPaint($root, data);
  }

  /**
   * Flip expanded state and repaint without rebinding handlers.
   *
   * Reachable only from the expandable branch's click binding (default
   * {@link onLeftClick}); compact-only bars never bind that handler.
   */
  private toggle(): void {
    this.expanded = !this.expanded;
    this.paint(false);
  }

  /**
   * Synchronize the expanded modifier class on the root element.
   *
   * @param $root Root jQuery element.
   */
  private syncExpandedModifier($root: JQuery): void {
    const expandedMod = this.bemModifier('expanded');
    if (this.expanded) {
      $root.addClass(expandedMod);
    } else {
      $root.removeClass(expandedMod);
    }
  }

  /**
   * Ensure the block and shared bar classes are present, then apply exactly one
   * status modifier based on {@link resolveStatus}.
   *
   * @param $root Root jQuery element.
   * @param data Current bar data.
   */
  private syncRootClasses($root: JQuery, data: TData): void {
    // Ensure block and bar classes are present
    $root.addClass(this.blockClass);
    $root.addClass(BAR_CLASS);

    // Remove all possible status modifiers, then apply resolved one
    $root.removeClass(`${BAR_CLASS}--${BarStatus.OK} ${BAR_CLASS}--${BarStatus.WARN} ${BAR_CLASS}--${BarStatus.ERROR}`);
    $root.addClass(`${BAR_CLASS}--${this.resolveStatus(data)}`);
  }

  // ── Optional indicators rendering ──

  /** Apply indicator state, marker, and retained badge/title updates in place. */
  private applyIndicators($root: JQuery): void {
    if (!this.supportsIndicators) {
      return;
    }

    this.syncIndicatorState($root);

    if (this.indicatorState !== BarIndicatorState.READY) {
      return;
    }

    for (const update of this.indicators) {
      this.applyIndicatorUpdate($root, update);
    }
  }

  /**
   * Synchronize indicator modifier, `aria-busy`, and the shared marker. A full paint
   * replaces root content, so the marker is (re)created whenever it is missing and
   * only updated in place within a single paint.
   */
  private syncIndicatorState($root: JQuery): void {
    const state = this.indicatorState;
    const isLoading = state === BarIndicatorState.LOADING;
    const stateClasses = Object.values(BarIndicatorState)
      .map((value) => `${BAR_CLASS}--indicators-${value}`)
      .join(' ');
    $root.removeClass(stateClasses);
    $root.addClass(`${BAR_CLASS}--indicators-${state}`);
    $root.attr('aria-busy', isLoading ? 'true' : 'false');

    const $marker = $root.find(`.${BAR_INDICATORS_CLASS}`);

    if (state === BarIndicatorState.READY) {
      $marker.remove();
      return;
    }

    const label = isLoading ? INDICATORS_LOADING_LABEL : INDICATORS_UNAVAILABLE_LABEL;

    if ($marker.length === 0) {
      $root.append(
        `<span class="${BAR_INDICATORS_CLASS}" role="status" aria-label="${label}" title="${label}"></span>`
      );
      return;
    }

    $marker.attr('aria-label', label);
    $marker.attr('title', label);
  }

  /**
   * Apply one update in place: badge as plain text inside the decorated chip/button
   * (never replaced), title as the native `title` attribute.
   */
  private applyIndicatorUpdate($root: JQuery, update: BarIndicatorUpdate): void {
    const $chip = $root.find(update.selector);
    if ($chip.length === 0) {
      return;
    }

    $chip.attr('title', update.title);

    const $badge = $chip.find(`.${BAR_INDICATOR_BADGE_CLASS}`);

    if (update.badge.length === 0) {
      $badge.remove();
      return;
    }

    if ($badge.length === 0) {
      $chip.append(`<span class="${BAR_INDICATOR_BADGE_CLASS}" aria-hidden="true">${escapeHtml(update.badge)}</span>`);
      return;
    }

    $badge.text(update.badge);
  }

  // ── Handler binding ──

  /**
   * Bind the expandable-mode disclosure click.
   * See the handler-binding contract on {@link BaseBar}.
   *
   * @param $root Root jQuery element.
   */
  private bindClick($root: JQuery): void {
    const toggleSelector = `.${this.bemElement('toggle')}`;
    $root
      .off(`click.${this.eventNs}`, toggleSelector)
      .on(`click.${this.eventNs}`, toggleSelector, (event: JQuery.ClickEvent) => {
        this.onLeftClick(event);
      });
  }

  /**
   * Bind the delegated contextmenu handler.
   * See the handler-binding contract on {@link BaseBar}.
   *
   * @param $root Root jQuery element.
   * @param data Current bar data, forwarded to `onRightClick`.
   */
  private bindContextMenu($root: JQuery, data: TData): void {
    const selector = `[${this.bemDataAttr('context-action')}]`;

    $root
      .off(`contextmenu.${this.eventNs}`, selector)
      .on(`contextmenu.${this.eventNs}`, selector, (event: JQuery.ContextMenuEvent) => {
        event.preventDefault();
        event.stopPropagation();

        try {
          const result = this.onRightClick(event, data);
          void Promise.resolve(result).catch((err: unknown) => {
            console.warn('[BaseBar] contextmenu handler rejected:', err);
          });
        } catch (err: unknown) {
          console.warn('[BaseBar] contextmenu handler error:', err);
        }
      });
  }
}
