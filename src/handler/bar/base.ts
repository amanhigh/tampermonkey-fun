/**
 * Options for configuring BaseBar click actions.
 */
export interface BaseBarOptions {
  /** CSS selector for delegated right-click target within the root element. */
  readonly rightSelector?: string;
  /** CSS class to toggle on the root element based on expanded state. */
  readonly expandedClass?: string;
}

/**
 * Interface for bar-style UI components that manage
 * a compact/expanded content lifecycle with optional click actions.
 *
 * @template TData The data type rendered by the bar.
 */
export interface IBaseBar<TData> {
  /**
   * Render the bar with fresh data.
   * Resets expanded state and renders in compact mode.
   *
   * @param data The data to render.
   */
  render(data: TData): void;
}

/**
 * Generic abstract base for bar-style UI components that manage
 * a compact/expanded content lifecycle with optional click actions.
 *
 * @template TData The data type rendered by the bar.
 */
export abstract class BaseBar<TData> implements IBaseBar<TData> {
  /** Stable jQuery event namespace owned by BaseBar. */
  private static readonly EVENT_NS = 'basebar';

  /** Whether the bar is currently in expanded mode. */
  private expanded = false;

  /** Retained data from the most recent render call. */
  private currentData?: TData;

  /**
   * @param rootSelector CSS selector for the root element (e.g. `#aman-display`).
   * @param options Optional click action configuration.
   */
  constructor(
    private readonly rootSelector: string,
    private readonly options?: BaseBarOptions
  ) {}

  /** @inheritdoc */
  public render(data: TData): void {
    this.currentData = data;
    this.expanded = false;
    this.paint();
  }

  /**
   * Render compact (collapsed) HTML for the given data.
   *
   * @param data The current data.
   * @returns HTML string for compact mode.
   */
  protected abstract renderCompact(data: TData): string;

  /**
   * Render expanded HTML for the given data.
   *
   * @param data The current data.
   * @returns HTML string for expanded mode.
   */
  protected abstract renderExpanded(data: TData): string;

  /**
   * Called during paint after the root HTML and expanded class are applied.
   * Override to apply additional root-level state classes based on the current data.
   *
   * @param $root Root jQuery element.
   * @param data Current bar data.
   */
  protected onRootStateUpdate(_$root: JQuery, _data: TData): void {
    // Default no-op — subclasses may override
  }

  /**
   * Called when the root element is left-clicked (toggle).
   * Override to add custom left-click behavior.
   */
  protected onLeftClick(): void {
    // Default no-op — subclasses may override
  }

  /**
   * Called when a delegated right-click target is right-clicked.
   * Override to add custom right-click behavior.
   *
   * @param _event The jQuery contextmenu event.
   * @param _data The current bar data.
   */
  protected onRightClick(_event: JQuery.ContextMenuEvent, _data: TData): void | Promise<void> {
    // Default no-op — subclasses may override
  }

  // ── Private rendering ──

  /**
   * Paint the root element with current state.
   * Handles handler deduplication by calling off() before on().
   */
  private paint(): void {
    const $root = $(this.rootSelector);
    const data = this.currentData;
    if (data === undefined) {
      return;
    }

    // Render HTML based on expanded state
    const html = this.expanded ? this.renderExpanded(data) : this.renderCompact(data);
    $root.html(html);

    // Apply expanded class if configured
    this.applyExpandedClass($root);

    // Hook for subclasses to apply additional root-level state classes
    this.onRootStateUpdate($root, data);

    // Bind left-click toggle (deduplicated via off/on)
    this.bindLeftClick($root);

    // Bind delegated right-click if configured
    this.bindRightClick($root, data);
  }

  /**
   * Apply or remove the expanded CSS class on the root element.
   *
   * @param $root Root jQuery element.
   */
  private applyExpandedClass($root: JQuery): void {
    const expandedClass = this.options?.expandedClass;
    if (!expandedClass) {
      return;
    }
    if (this.expanded) {
      $root.addClass(expandedClass);
    } else {
      $root.removeClass(expandedClass);
    }
  }

  /**
   * Bind the root left-click toggle handler.
   * Calls off('click') first to prevent duplicate handlers.
   *
   * @param $root Root jQuery element.
   */
  private bindLeftClick($root: JQuery): void {
    $root.off(`click.${BaseBar.EVENT_NS}`).on(`click.${BaseBar.EVENT_NS}`, () => {
      this.onLeftClick();
      this.toggle();
    });
  }

  /**
   * Bind the delegated right-click handler if configured.
   * Calls off('contextmenu') first to prevent duplicate handlers.
   * Automatically calls preventDefault() and stopPropagation() on the event.
   *
   * @param $root Root jQuery element.
   * @param data Current data for passing to onRightClick.
   */
  private bindRightClick($root: JQuery, data: TData): void {
    const rightSelector = this.options?.rightSelector;
    if (!rightSelector) {
      return;
    }

    $root
      .off(`contextmenu.${BaseBar.EVENT_NS}`, rightSelector)
      .on(`contextmenu.${BaseBar.EVENT_NS}`, rightSelector, (event: JQuery.ContextMenuEvent) => {
        event.preventDefault();
        event.stopPropagation();
        void this.onRightClick(event, data);
      });
  }

  /**
   * Toggle expanded state and re-paint.
   */
  private toggle(): void {
    this.expanded = !this.expanded;
    this.paint();
  }
}
