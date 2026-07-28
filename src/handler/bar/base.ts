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
 * @template TData The data type rendered by the bar.
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
 * 1. **`render(data)`** — stores data, resets expanded, calls `paint()` (full bind).
 * 2. **`paint(bindHandlers)`** — queries root `#<barId>`, early-returns if `$root.length === 0`,
 *    renders compact/expanded HTML, ensures block class, syncs expanded modifier,
 *    optionally binds click + contextmenu (only on full paint), calls `onPaint()` last.
 * 3. **`toggle()`** — flips expanded, calls `paint(false)` (no handler rebinding).
 * 4. **`onLeftClick()`** — default calls `toggle()`; override replaces unless `super` called.
 * 5. **`onRightClick(event, data)`** — protected hook for context-menu actions.
 * 6. **`onPaint($root, data)`** — default no-op called after handler binding.
 * 7. **`refresh()`** — latest-request-wins: increments revision, awaits `loadData()`,
 *    calls `render()` only if revision is current.
 */
export interface IBaseBar<TData> extends IDomainEventConsumer {
  /** Render the bar with fresh data. Resets expanded state and paints compact. */
  render(data: TData): void;

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
 * ## Handler Binding
 *
 * - Left-click: `$root.off('click.{ns}').on('click.{ns}', () => this.onLeftClick())`.
 *   The binding calls **only** `onLeftClick()`; the default implementation toggles.
 * - Context-menu: `$root.off('contextmenu.{ns}', sel).on('contextmenu.{ns}', sel, handler)`.
 *   Always binds to the generated `[data-{ns}-context-action]` selector.
 *   Calls `preventDefault` + `stopPropagation`, then `onRightClick(event, data)`.
 *   Catches rejected thenables and sync errors to prevent unhandled rejections.
 * - Handler deduplication: `off()` is called before `on()` when `bindHandlers` is true.
 *   Toggle calls `paint(false)` which does not rebind handlers.
 */
export abstract class BaseBar<TData> implements IBaseBar<TData> {
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

  // ── Public API ──

  /** @inheritdoc */
  public render(data: TData): void {
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

  /**
   * Render expanded HTML for the given data.
   * @param data The current data.
   * @returns HTML string for expanded mode.
   */
  protected abstract renderExpanded(data: TData): string;

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

    // Render compact/expanded HTML
    const html = this.expanded ? this.renderExpanded(data) : this.renderCompact(data);
    $root.html(html);

    // Ensure the generated block class is present
    $root.addClass(this.blockClass);

    // Synchronize the generated expanded modifier
    this.syncExpandedModifier($root);

    // Bind namespaced handlers only on full paint (not during toggle repaint)
    if (bindHandlers) {
      this.bindClick($root);
      this.bindContextMenu($root, data);
    }

    // Post-paint hook (called last)
    this.onPaint($root, data);
  }

  /**
   * Toggle expanded state and repaint without rebinding handlers.
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
   * Bind the root left-click handler with namespace deduplication.
   * Calls only `this.onLeftClick()` — the default implementation toggles,
   * but an override can replace or extend via `super`.
   *
   * @param $root Root jQuery element.
   */
  private bindClick($root: JQuery): void {
    $root.off(`click.${this.eventNs}`).on(`click.${this.eventNs}`, () => {
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
