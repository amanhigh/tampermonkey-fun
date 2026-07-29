import { IDomainEventConsumer, ISubscriber } from '../../manager/event_bus';
import { DomainEventType } from '../../models/domain_event';
import { BarId } from '../../models/bar';

/**
 * Interface for bar-style UI components that manage a compact/expanded content lifecycle
 * with domain-event-driven refresh.
 *
 * Extends {@link IDomainEventConsumer} so bars can register event subscriptions
 * that trigger automatic refresh.
 *
 * ## BEM Contract
 *
 * Block class is the {@link BarId} value itself (e.g. `aman-alert-ticker-bar`).
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
 * Namespace (`ns`) is derived by stripping a leading `aman-` and trailing `-bar`
 * from the {@link BarId} value (e.g. `aman-alert-ticker-bar` → `alert-ticker`).
 *
 * Event namespace is `bar-{ns}` (e.g. `bar-alert-ticker`) and is used for both
 * the jQuery `click` and `contextmenu` namespaced bindings.
 *
 * ## Lifecycle Ordering
 *
 * 1. **`render(data)`** — (protected) stores data, resets expanded, calls `paint()` (full bind),
 *    and invalidates any in-flight `refresh()`.
 * 2. **`paint(bindHandlers)`** — queries root `#<barId>`, early-returns if `$root.length === 0`,
 *    renders a disclosure shell (`<button>` toggle + `<div>` details container),
 *    ensures block class, syncs expanded modifier and `aria-expanded`/`hidden`,
 *    optionally binds delegated click + contextmenu (only on full paint), calls `onPaint()` last.
 * 3. **`toggle()`** — flips expanded, calls `paint(false)` (no handler rebinding).
 * 4. **`onLeftClick()`** — default calls `toggle()`; override replaces unless `super` called.
 * 5. **`onRightClick(event, data)`** — protected hook for context-menu actions.
 * 6. **`onPaint($root, data)`** — default no-op called after handler binding.
 * 7. **`refresh()`** — latest-request-wins: increments revision, awaits `loadData()`,
 *    calls `render()` only if revision is current.
 */
export interface IBaseBar extends IDomainEventConsumer {
  /** Fetch fresh data via `loadData()` and re-render (latest-request-wins). */
  refresh(): Promise<void>;
}

/**
 * Generic abstract base for bar-style UI components that manage
 * a compact/expanded content lifecycle with event-driven refresh.
 *
 * @template TData The data type rendered by the bar.
 *
 * @see {@link IBaseBar} for the full lifecycle and BEM contract.
 *
 * ## Expansion Contract
 *
 * Bars can optionally support expandable details via {@link renderDetails}:
 * - **Return `null`** (default): Compact-only mode. Renders only
 *   `renderCompact(data)` directly in the root without disclosure shell,
 *   toggle button, details container, or expanded modifier handling.
 *   Context-menu binding is still available if compact content includes
 *   context-action attributes.
 * - **Return `string`**: Expandable mode. Renders the full disclosure shell
 *   with toggle button, details container, and expanded modifier handling.
 *   Context-menu binding is available on `[data-{ns}-context-action]` selectors.
 *
 * ## Handler Binding
 *
 * - Left-click (expandable mode only): delegated to the generated `.{block}__toggle` button via
 *   `$root.off('click.{ns}', sel).on('click.{ns}', sel, handler)`.
 *   Calls only `this.onLeftClick()`; the default implementation toggles.
 *   Native `<button>` semantics provide Enter/Space activation.
 * - Context-menu: `$root.off('contextmenu.{ns}', sel).on('contextmenu.{ns}', sel, handler)`.
 *   Always binds to the generated `[data-{ns}-context-action]` selector.
 *   Calls `preventDefault` + `stopPropagation`, then `onRightClick(event, data)`.
 *   Catches rejected thenables and sync errors to prevent unhandled rejections.
 * - Handler deduplication: `off()` is called before `on()` when `bindHandlers` is true.
 *   Toggle calls `paint(false)` which does not rebind handlers.
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

  /**
   * @param barId The {@link BarId} enum value for this bar instance.
   */
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
   * @param element Element name.
   * @returns `{blockClass}__{element}`
   */
  protected bemElement(element: string): string {
    return `${this.blockClass}__${element}`;
  }

  /**
   * Generate a BEM modifier class.
   * @param modifier Modifier name.
   * @returns `{blockClass}--{modifier}`
   */
  protected bemModifier(modifier: string): string {
    return `${this.blockClass}--${modifier}`;
  }

  /**
   * Generate a BEM element-modifier class.
   * @param element Element name.
   * @param modifier Modifier name.
   * @returns `{blockClass}__{element}--{modifier}`
   */
  protected bemElementModifier(element: string, modifier: string): string {
    return `${this.blockClass}__${element}--${modifier}`;
  }

  /**
   * Generate a child element ID.
   * @param name Child name.
   * @returns `{blockClass}-{name}`
   */
  protected bemChildId(name: string): string {
    return `${this.blockClass}-${name}`;
  }

  /**
   * Generate a namespaced data attribute name.
   * @param name Attribute name (without `data-` prefix or namespace).
   * @returns `data-{namespace}-{name}`
   *
   * @example
   * // For BarId.ALERT (namespace = 'alert-ticker')
   * this.bemDataAttr('symbol')       // 'data-alert-ticker-symbol'
   * this.bemDataAttr('context-action') // 'data-alert-ticker-context-action'
   */
  protected bemDataAttr(name: string): string {
    return `data-${this.namespace}-${name}`;
  }

  // ── Protected data application ──

  /**
   * Apply fresh data to the bar, reset expanded state, and perform a full paint.
   * Also invalidates any in-flight `refresh()` so a stale `loadData()` result
   * cannot overwrite this explicitly applied data.
   *
   * @param data The data to render.
   */
  protected render(data: TData): void {
    // Invalidate any pending refresh so it cannot overwrite newer data
    ++this.loadRevision;
    this.currentData = data;
    this.expanded = false;
    this.paint(true);
  }

  /** @inheritdoc */
  public async refresh(): Promise<void> {
    const revision = ++this.loadRevision;
    const data = await this.loadData();
    if (revision !== this.loadRevision) {
      return;
    }
    this.render(data);
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
   * Domain event types that should trigger a refresh when received.
   * Return an empty array to disable automatic refresh subscriptions.
   */
  protected abstract get refreshEvents(): readonly DomainEventType[];

  /**
   * Load fresh data for this bar. Called by {@link refresh}.
   * @returns The loaded data.
   */
  protected abstract loadData(): Promise<TData>;

  /**
   * Render compact (collapsed) HTML for the given data.
   * @param data The current data.
   * @returns HTML string for compact mode.
   */
  protected abstract renderCompact(data: TData): string;

  // ── Nullable expansion contract ──

  /**
   * Render expanded detail content for the given data.
   *
   * Evaluated during every {@link paint} call to determine whether the
   * bar supports expansion. When a string is returned, paint renders
   * the full disclosure shell (toggle button, details container,
   * expanded modifier) and the returned HTML populates the details
   * container when the bar is expanded. BaseBar composes the shell;
   * subclasses return only the inner content (rows, empty state, etc.).
   *
   * Override this method to return a string to enable expandable behavior
   * with disclosure shell, toggle button, details container, and expanded
   * modifier handling. Return `null` (the default) to disable expansion
   * and render only compact content directly in the root.
   *
   * When a string is returned, the bar supports:
   * - Disclosure toggle button with `aria-expanded`/`aria-controls`
   * - Hidden details container that shows/hides on toggle
   * - Expanded modifier class toggling
   * - Context-menu binding on `[data-{ns}-context-action]` selectors
   * - Handler deduplication via namespace
   * - Stale-request protection for refresh sequencing
   *
   * When `null` is returned (default), the bar renders only
   * `renderCompact(data)` directly in the root without any expansion
   * infrastructure. Context-menu binding is still available if compact
   * content includes context-action attributes.
   *
   * @param _data The current data.
   * @returns HTML string for expanded detail content, or `null` to disable expansion.
   */
  protected renderDetails(_data: TData): string | null {
    return null;
  }

  // ── Protected hooks ──

  /**
   * Default no-op post-paint hook. Called after both click and contextmenu
   * handlers are bound during a full paint, and after each toggle repaint.
   * Override to apply additional root-level state based on the current data.
   *
   * @param $root Root jQuery element.
   * @param data Current bar data.
   */
  protected onPaint(_$root: JQuery, _data: TData): void {
    // Default no-op
  }

  /**
   * Called when the root element is left-clicked.
   * Default implementation toggles expanded state via {@link toggle}.
   * Override to replace the default behavior; call `super.onLeftClick()`
   * to retain the toggle.
   */
  protected onLeftClick(): void {
    this.toggle();
  }

  /**
   * Called when a delegated contextmenu target is right-clicked.
   * Override to add custom right-click behavior.
   *
   * @param _event The jQuery contextmenu event.
   * @param _data The current bar data.
   */
  protected onRightClick(_event: JQuery.ContextMenuEvent, _data: TData): void | Promise<void> {
    // Default no-op
  }

  // ── Private rendering ──

  /**
   * Unified paint cycle: query root, render HTML, optionally bind handlers, call onPaint.
   * Called from {@link render} with `bindHandlers=true` and from {@link toggle} with `false`.
   *
   * When {@link renderDetails} returns `null` (no expansion), renders only
   * compact content directly in the root without disclosure shell, toggle button,
   * details container, or expanded modifier handling. Context-menu is still
   * bound if compact content includes context-action attributes.
   *
   * When {@link renderDetails} returns a string, renders the full disclosure shell
   * with toggle button, details container, and expanded modifier handling.
   *
   * @param bindHandlers When true, rebind click/contextmenu via off/on deduplication.
   *                     When false, only update HTML and modifier state (toggle path).
   */
  private paint(bindHandlers: boolean): void {
    const $root = $(`#${this.barId}`);
    const data = this.currentData;

    // Safely return when root selector does not exist
    if ($root.length === 0 || data === undefined) {
      return;
    }

    // Ensure the generated block class is present
    $root.addClass(this.blockClass);

    const detailsHtml = this.renderDetails(data);
    const compactHtml = this.renderCompact(data);

    if (detailsHtml === null) {
      // Compact-only mode: render compact content directly in root.
      // Explicitly reset expanded state so a subclass cannot retain
      // stale expanded state if its renderDetails mode changes between paints.
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

    // Synchronize expanded modifier (common to both modes)
    this.syncExpandedModifier($root);

    // Bind context-menu (common) and disclosure click (expandable only)
    if (bindHandlers) {
      this.bindContextMenu($root, data);
      if (detailsHtml !== null) {
        this.bindClick($root);
      }
    }

    // Post-paint hook (called last)
    this.onPaint($root, data);
  }

  /**
   * Toggle expanded state and repaint without rebinding handlers.
   * Only invoked via the expandable branch's click binding; compact-only bars
   * never reach this method because no click handler is bound for them.
   */
  private toggle(): void {
    this.expanded = !this.expanded;
    this.paint(false);
  }

  /**
   * Synchronize the expanded modifier class on the root element.
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
   * Bind the delegated left-click handler to the disclosure toggle button
   * with namespace deduplication.
   * Calls only `this.onLeftClick()` — the default implementation toggles,
   * but an override can replace or extend via `super`.
   *
   * @param $root Root jQuery element.
   */
  private bindClick($root: JQuery): void {
    const toggleSelector = `.${this.bemElement('toggle')}`;
    $root.off(`click.${this.eventNs}`, toggleSelector).on(`click.${this.eventNs}`, toggleSelector, () => {
      this.onLeftClick();
    });
  }

  /**
   * Bind the delegated contextmenu handler with namespace deduplication.
   * Always binds to the generated `[data-{ns}-context-action]` selector.
   * Calls `preventDefault` + `stopPropagation`, then `onRightClick(event, data)`.
   * Catches rejected thenables and synchronous errors to prevent unhandled rejections.
   *
   * @param $root Root jQuery element.
   * @param data Current data for passing to onRightClick.
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
