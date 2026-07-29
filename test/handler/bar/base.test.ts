/**
 * BaseBar contract tests.
 *
 * Protects the BaseBar public/protected contract:
 *
 * Contract points under test:
 *  - Constructor accepts a single `BarId`; no options bag
 *  - Root selector, block class, expanded modifier, and event namespace derived from `BarId`
 *  - BEM element / modifier / element-modifier / child-id / data-attribute generation
 *  - Disclosure shell: `<button>` toggle with `aria-expanded`/`aria-controls` + hidden `<div>` details
 *  - Context-menu always bound to generated `[data-alert-ticker-context-action]` selector
 *  - Left-click delegated to generated `.__toggle` selector, not the entire root
 *  - `IBaseBar` exposes `refresh`, `registerEvents` (no `render` — that is protected)
 *  - Subclass-declared `refreshEvents` wired by `registerEvents`
 *  - Refresh via protected `loadData()` with stale-completion protection
 *  - Missing-root no-op
 *  - Default left-click toggles; override replaces toggle; super retains toggle
 *  - `onPaint` called after both click and contextmenu handlers are bound
 *  - Protected `render(data)` invalidates in-flight refresh
 */

import { BaseBar, IBaseBar } from '../../../src/handler/bar/base';
import { BarId, BAR_CLASS, BarStatus } from '../../../src/models/bar';
import { DomainEventType } from '../../../src/models/domain_event';

// ── Mock jQuery ──

let mockRootEl: any;

function createMockElement(): any {
  return {
    html: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    addClass: jest.fn().mockReturnThis(),
    removeClass: jest.fn().mockReturnThis(),
    toggleClass: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    length: 1,
  };
}

const ALERT_ROOT = `#${BarId.ALERT}`;
const EVENT_NS = 'bar-alert-ticker';
const EXPANDED_MOD = 'aman-alert-ticker-bar--expanded';
const CONTEXT_SELECTOR = '[data-alert-ticker-context-action]';
const TOGGLE_SELECTOR = '.aman-alert-ticker-bar__toggle';
const DETAILS_ID = 'aman-alert-ticker-bar-details';

function createDefaultJQuery(selector: string): any {
  if (selector === ALERT_ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

// ── Shared test data ──

interface TestData {
  label: string;
  count: number;
}

// ══════════════════════════════════════════════════════════════════════
// Test subclasses — all extend TestBarBase for a coherent contract
// ══════════════════════════════════════════════════════════════════════

/** Concrete base supplying both protected contracts (`loadData`, `refreshEvents`) and `resolveStatus`. */
class TestBarBase extends BaseBar<TestData> {
  private status: BarStatus = BarStatus.OK;

  constructor(barId: BarId) {
    super(barId);
  }

  /** Test-only setter for status control. */
  public setStatus(status: BarStatus): void {
    this.status = status;
  }

  /** Public wrapper for protected `render(data)` — test-only access path. */
  public render(data: TestData): void {
    super.render(data);
  }

  protected resolveStatus(_data: TestData): BarStatus {
    return this.status;
  }

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}:${data.count}`;
  }

  protected renderDetails(data: TestData): string {
    return `details:${data.label}:${data.count}`;
  }

  protected async loadData(): Promise<TestData> {
    return { label: 'default', count: 0 };
  }

  protected get refreshEvents(): readonly DomainEventType[] {
    return [];
  }
}

/** Minimal — no overrides beyond the base. */
class TestBar extends TestBarBase {}

/** Override onLeftClick WITHOUT super — replaces default toggle. */
class TestBarOverrideLeftClick extends TestBarBase {
  public leftClickCount = 0;

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}`;
  }

  protected renderDetails(data: TestData): string {
    return `details:${data.label}`;
  }

  protected onLeftClick(): void {
    this.leftClickCount++;
  }
}

/** Override onLeftClick WITH super — retains toggle. */
class TestBarSuperLeftClick extends TestBarBase {
  public leftClickCount = 0;

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}`;
  }

  protected renderDetails(data: TestData): string {
    return `details:${data.label}`;
  }

  protected onLeftClick(): void {
    this.leftClickCount++;
    super.onLeftClick();
  }
}

/** Override onRightClick — receives event + data from always-bound contextmenu. */
class TestBarWithRightClick extends TestBarBase {
  public lastRightClick: { event: JQuery.ContextMenuEvent; data: TestData } | null = null;

  protected onRightClick(event: JQuery.ContextMenuEvent, data: TestData): void {
    this.lastRightClick = { event, data };
  }
}

/** Async onRightClick override. */
class TestBarWithAsyncRightClick extends TestBarBase {
  public lastRightClickData: TestData | null = null;

  protected async onRightClick(_event: JQuery.ContextMenuEvent, data: TestData): Promise<void> {
    this.lastRightClickData = data;
  }
}

/** Expose protected BEM helpers for assertion. */
class TestBarBEM extends TestBarBase {
  public getBlockClass(): string {
    return this.blockClass;
  }

  public getElementClass(element: string): string {
    return this.bemElement(element);
  }

  public getModifierClass(modifier: string): string {
    return this.bemModifier(modifier);
  }

  public getElementModifierClass(element: string, modifier: string): string {
    return this.bemElementModifier(element, modifier);
  }

  public getChildId(name: string): string {
    return this.bemChildId(name);
  }

  public getDataAttrName(name: string): string {
    return this.bemDataAttr(name);
  }
}

/** Record handler binding count inside onPaint to verify ordering. */
class TestBarWithOnPaint extends TestBarBase {
  public onPaintCount = 0;
  public handlersBoundAtPaint = 0;

  protected onPaint(): void {
    this.handlersBoundAtPaint = mockRootEl.on.mock.calls.length;
    this.onPaintCount++;
  }
}

/** Override loadData with deferred control for stale-completion tests. */
class TestBarWithLoadData extends TestBarBase {
  public loadCount = 0;
  public loadDeferred: Array<(data: TestData) => void> = [];

  protected async loadData(): Promise<TestData> {
    this.loadCount++;
    return new Promise<TestData>((resolve) => {
      this.loadDeferred.push(resolve);
    });
  }
}

/** Override refreshEvents with specific DomainEventType values. */
class TestBarWithEvents extends TestBarBase {
  public loadCount = 0;
  public loadDeferred: Array<(data: TestData) => void> = [];

  protected async loadData(): Promise<TestData> {
    this.loadCount++;
    return new Promise<TestData>((resolve) => {
      this.loadDeferred.push(resolve);
    });
  }

  protected get refreshEvents(): readonly DomainEventType[] {
    return [DomainEventType.TICKER_CHANGED, DomainEventType.ALERT_TICKER_LINKED];
  }
}

// ── Helpers ──

function getClickHandler(): (() => void) | undefined {
  const call = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === `click.${EVENT_NS}`);
  return call?.[2] as (() => void) | undefined;
}

function getContextMenuHandler(): ((event: JQuery.ContextMenuEvent) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === `contextmenu.${EVENT_NS}`);
  return call?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;
}

// ══════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════

describe('BaseBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockJQuery.mockImplementation(createDefaultJQuery);
  });

  describe('constructor', () => {
    it('should accept a BarId as its sole required parameter', () => {
      const bar = new TestBar(BarId.ALERT);
      expect(bar).toBeDefined();
    });

    it('should derive root selector as #<barId> during paint', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'X', count: 1 });
      expect(mockJQuery).toHaveBeenCalledWith(ALERT_ROOT);
    });

    it('should derive block class from BarId value', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getBlockClass()).toBe(BarId.ALERT);
    });
  });

  describe('IBaseBar interface', () => {
    it('should expose refresh', () => {
      const bar: IBaseBar = new TestBar(BarId.ALERT);
      expect(typeof bar.refresh).toBe('function');
    });

    it('should expose registerEvents', () => {
      const bar: IBaseBar = new TestBar(BarId.ALERT);
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  describe('BEM class generation', () => {
    it('should generate block class equal to BarId', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getBlockClass()).toBe('aman-alert-ticker-bar');
    });

    it('should generate element class as block__element', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getElementClass('row')).toBe('aman-alert-ticker-bar__row');
    });

    it('should generate modifier class as block--modifier', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getModifierClass('expanded')).toBe('aman-alert-ticker-bar--expanded');
    });

    it('should generate element-modifier class as block__element--modifier', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getElementModifierClass('row', 'active')).toBe(
        'aman-alert-ticker-bar__row--active'
      );
    });

    it('should generate child-id as block-childName', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getChildId('count')).toBe('aman-alert-ticker-bar-count');
    });

    it('should generate data-attribute with stripped prefix/suffix', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getDataAttrName('symbol')).toBe('data-alert-ticker-symbol');
    });

    it('should generate context-action data attribute', () => {
      const bar = new TestBarBEM(BarId.ALERT);
      expect(bar.getDataAttrName('context-action')).toBe('data-alert-ticker-context-action');
    });

    it('should use bar-alert-ticker event namespace', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'X', count: 1 });

      const onEvents = mockRootEl.on.mock.calls.map((c: any[]) => c[0]);
      expect(onEvents).toContain(`click.${EVENT_NS}`);
    });
  });

  describe('render', () => {
    it('should render compact HTML with the provided data', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Alpha', count: 1 });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('compact:Alpha:1')
      );
    });

    it('should store the latest data for re-render on toggle', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'First', count: 10 });

      const clickHandler = getClickHandler()!;
      clickHandler();

      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:First:10')
      );
    });

    it('should start in compact mode', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'X', count: 5 });

      expect(mockRootEl.html).toHaveBeenCalledTimes(1);
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('compact:X:5')
      );
    });
  });

  describe('expanded state lifecycle', () => {
    it('should toggle between compact and expanded via disclosure toggle', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Toggle', count: 3 });

      const clickHandler = getClickHandler()!;

      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:Toggle:3')
      );

      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:Toggle:3')
      );
    });

    it('should call subclass renderCompact and renderDetails methods', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Lifecycle', count: 7 });
      const clickHandler = getClickHandler()!;

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('compact:Lifecycle:7')
      );

      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:Lifecycle:7')
      );

      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:Lifecycle:7')
      );
    });

    it('should apply generated expanded modifier when expanded and remove when compact', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Mod', count: 1 });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith(EXPANDED_MOD);

      const clickHandler = getClickHandler()!;
      clickHandler();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(EXPANDED_MOD);

      clickHandler();
      expect(mockRootEl.removeClass).toHaveBeenCalledWith(EXPANDED_MOD);
    });
  });

  describe('disclosure shell', () => {
    it('should render initial aria-expanded="false" with hidden details', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Shell', count: 1 });

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain(`aria-controls="${DETAILS_ID}"`);
      expect(html).toContain('aman-alert-ticker-bar__toggle');
      expect(html).toContain(`id="${DETAILS_ID}"`);
      expect(html).toContain('hidden');
    });

    it('should delegate click to .aman-alert-ticker-bar__toggle selector', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Delegate', count: 1 });

      const onCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === `click.${EVENT_NS}`
      );
      expect(onCalls.length).toBe(1);
      expect(onCalls[0][1]).toBe(TOGGLE_SELECTOR);
      expect(typeof onCalls[0][2]).toBe('function');
    });

    it('should expand with aria-expanded="true" and visible details after toggle', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Expand', count: 1 });

      const clickHandler = getClickHandler()!;
      clickHandler();

      const html = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0] as string;
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain('details:Expand:1');
      expect(html).not.toContain('hidden');
      expect(mockRootEl.addClass).toHaveBeenCalledWith(EXPANDED_MOD);
    });

    it('should not include details content in initial render but show after expansion', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Content', count: 1 });

      const initialHtml = mockRootEl.html.mock.calls[0][0] as string;
      expect(initialHtml).toContain('hidden');
      expect(initialHtml).not.toContain('details:Content:1');

      const clickHandler = getClickHandler()!;
      clickHandler();

      const expandedHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0] as string;
      expect(expandedHtml).toContain('details:Content:1');
      expect(expandedHtml).not.toContain('hidden');
    });
  });

  describe('refresh', () => {
    it('should call loadData and render the result', async () => {
      const bar = new TestBarWithLoadData(BarId.ALERT);
      const promise = bar.refresh();

      expect(bar.loadCount).toBe(1);

      bar.loadDeferred[0]({ label: 'loaded', count: 42 });
      await promise;

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('compact:loaded:42')
      );
    });

    it('should ignore stale loadData result and render newest', async () => {
      const bar = new TestBarWithLoadData(BarId.ALERT);

      const first = bar.refresh();
      const second = bar.refresh();

      bar.loadDeferred[1]({ label: 'new', count: 2 });
      await second;
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:new:2')
      );

      bar.loadDeferred[0]({ label: 'old', count: 1 });
      await first;

      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:new:2')
      );
    });

    it('should discard pending refresh when render applies newer data first', async () => {
      const bar = new TestBarWithLoadData(BarId.ALERT);

      // Start a refresh that remains pending
      const promise = bar.refresh();
      expect(bar.loadCount).toBe(1);

      // While refresh is pending, apply newer data via test-only render
      bar.render({ label: 'newer', count: 99 });
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:newer:99')
      );

      // Resolve the stale loadData — its result must be discarded
      bar.loadDeferred[0]({ label: 'old', count: 1 });
      await promise;

      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:newer:99')
      );
    });

    it('should resolve default data from base loadData', async () => {
      const bar = new TestBar(BarId.ALERT);
      await bar.refresh();

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('compact:default:0')
      );
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to subclass-declared refreshEvents', () => {
      const bar = new TestBarWithEvents(BarId.ALERT);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [DomainEventType.TICKER_CHANGED, DomainEventType.ALERT_TICKER_LINKED],
        expect.any(Function)
      );
    });

    it('should call loadData when a subscribed event fires', async () => {
      const bar = new TestBarWithEvents(BarId.ALERT);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      const callback = mockSubscriber.subscribeMany.mock.calls[0][1] as () => Promise<void>;
      const promise = callback();

      expect(bar.loadCount).toBe(1);

      bar.loadDeferred[0]({ label: 'event', count: 1 });
      await promise;
    });

    it('should not subscribe when refreshEvents is empty', () => {
      const bar = new TestBar(BarId.ALERT);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).not.toHaveBeenCalled();
    });
  });

  describe('missing-root no-op', () => {
    it('should not throw when root element is missing during render', () => {
      const missingRootEl = createMockElement();
      missingRootEl.length = 0;
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return missingRootEl;
        return createMockElement();
      });

      const bar = new TestBar(BarId.ALERT);
      expect(() => bar.render({ label: 'X', count: 1 })).not.toThrow();
    });

    it('should not throw when root element is missing during re-render', () => {
      const missingRootEl = createMockElement();
      missingRootEl.length = 0;
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return missingRootEl;
        return createMockElement();
      });

      const bar = new TestBar(BarId.ALERT);
      expect(() => {
        bar.render({ label: 'X', count: 1 });
        bar.render({ label: 'Y', count: 2 });
      }).not.toThrow();
    });
  });

  describe('handler deduplication', () => {
    it('should call off then on for click on each render', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Seq', count: 1 });

      const filterClick = (prefix: string) =>
        mockRootEl[prefix].mock.calls.filter((c: any[]) => c[0] === `click.${EVENT_NS}`);

      expect(filterClick('off').length).toBe(1);
      expect(filterClick('on').length).toBe(1);

      bar.render({ label: 'Seq', count: 2 });

      expect(filterClick('off').length).toBe(2);
      expect(filterClick('on').length).toBe(2);
    });

    it('should not duplicate contextmenu handlers after re-render', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Dedup', count: 1 });
      bar.render({ label: 'Dedup', count: 2 });

      const filterCtx = (prefix: string) =>
        mockRootEl[prefix].mock.calls.filter(
          (c: any[]) => c[0] === `contextmenu.${EVENT_NS}`
        );

      expect(filterCtx('off').length).toBe(2);
      expect(filterCtx('on').length).toBe(2);
    });
  });

  describe('left click behavior', () => {
    it('should allow override to replace toggle', () => {
      const bar = new TestBarOverrideLeftClick(BarId.ALERT);
      bar.render({ label: 'Override', count: 1 });
      const clickHandler = getClickHandler()!;

      clickHandler();
      expect(bar.leftClickCount).toBe(1);
      expect(mockRootEl.html).toHaveBeenCalledTimes(1);
    });

    it('should allow explicit super to retain toggle', () => {
      const bar = new TestBarSuperLeftClick(BarId.ALERT);
      bar.render({ label: 'Super', count: 5 });
      const clickHandler = getClickHandler()!;

      clickHandler();
      expect(bar.leftClickCount).toBe(1);
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:Super')
      );

      clickHandler();
      expect(bar.leftClickCount).toBe(2);
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:Super')
      );
    });
  });

  describe('context-menu', () => {
    it('should always bind to the generated context-action selector', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Bind', count: 1 });

      const onCtxCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === `contextmenu.${EVENT_NS}`
      );
      expect(onCtxCalls.length).toBe(1);
      expect(onCtxCalls[0][1]).toBe(CONTEXT_SELECTOR);
    });

    it('should invoke default no-op handler safely when no override', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Safe', count: 1 });

      const handler = getContextMenuHandler()!;
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      expect(() => handler(mockEvent)).not.toThrow();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should call preventDefault and stopPropagation', () => {
      const bar = new TestBarWithRightClick(BarId.ALERT);
      bar.render({ label: 'Prevent', count: 1 });

      const handler = getContextMenuHandler()!;
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should pass event and current data to onRightClick', () => {
      const bar = new TestBarWithRightClick(BarId.ALERT);
      bar.render({ label: 'Pass', count: 42 });

      const handler = getContextMenuHandler()!;
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      handler(mockEvent);

      expect(bar.lastRightClick).not.toBeNull();
      expect(bar.lastRightClick!.data).toEqual({ label: 'Pass', count: 42 });
      expect(bar.lastRightClick!.event).toBe(mockEvent);
    });

    it('should support async onRightClick handler', async () => {
      const bar = new TestBarWithAsyncRightClick(BarId.ALERT);
      bar.render({ label: 'Async', count: 1 });

      const handler = getContextMenuHandler()!;
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      handler(mockEvent);
      await new Promise((r) => setTimeout(r, 0));

      expect(bar.lastRightClickData).toEqual({ label: 'Async', count: 1 });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should retain latest data for toggle after right-click', () => {
      const bar = new TestBarWithRightClick(BarId.ALERT);
      bar.render({ label: 'Rerender', count: 10 });

      const handler = getContextMenuHandler()!;
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      handler(mockEvent);

      const clickHandler = getClickHandler()!;
      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:Rerender:10')
      );
    });
  });

  describe('onPaint lifecycle', () => {
    it('should be called after both click and contextmenu handlers are bound', () => {
      const bar = new TestBarWithOnPaint(BarId.ALERT);
      bar.render({ label: 'Paint', count: 1 });

      expect(bar.onPaintCount).toBe(1);
      expect(bar.handlersBoundAtPaint).toBe(2);
    });

    it('should be called on each paint cycle including toggle', () => {
      const bar = new TestBarWithOnPaint(BarId.ALERT);
      bar.render({ label: 'Paint', count: 1 });
      expect(bar.onPaintCount).toBe(1);

      const clickHandler = getClickHandler()!;
      clickHandler();
      expect(bar.onPaintCount).toBe(2);
      expect(bar.handlersBoundAtPaint).toBe(2);
    });
  });

  describe('status synchronization', () => {
    it('should apply BAR_CLASS to root element during paint', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Status', count: 1 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BAR_CLASS);
    });

    it('should apply aman-bar--ok modifier when resolveStatus returns OK', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.setStatus(BarStatus.OK);
      bar.render({ label: 'Ok', count: 1 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });

    it('should apply aman-bar--warn modifier when resolveStatus returns WARN', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.setStatus(BarStatus.WARN);
      bar.render({ label: 'Warn', count: 1 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.WARN}`);
    });

    it('should apply aman-bar--error modifier when resolveStatus returns ERROR', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.setStatus(BarStatus.ERROR);
      bar.render({ label: 'Error', count: 1 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should remove prior status modifiers before applying new status', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.setStatus(BarStatus.OK);
      bar.render({ label: 'First', count: 1 });

      // Verify OK was applied
      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);

      // Reset mocks and re-render with WARN
      jest.clearAllMocks();
      mockRootEl = createMockElement();
      mockJQuery.mockImplementation(createDefaultJQuery);

      bar.setStatus(BarStatus.WARN);
      bar.render({ label: 'Second', count: 2 });

      // Should have removed the prior OK modifier
      expect(mockRootEl.removeClass).toHaveBeenCalledWith(
        expect.stringContaining(`${BAR_CLASS}--${BarStatus.OK}`)
      );
      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.WARN}`);
    });

    it('should update status on each render call', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.setStatus(BarStatus.ERROR);
      bar.render({ label: 'A', count: 1 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);

      bar.setStatus(BarStatus.OK);
      bar.render({ label: 'B', count: 2 });

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });
  });

  describe('data retention', () => {
    it('should use latest data for toggle after multiple renders', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'Old', count: 1 });
      bar.render({ label: 'New', count: 99 });

      const clickHandler = getClickHandler()!;
      clickHandler();

      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:New:99')
      );
    });

    it('should reset expanded state on each render call', () => {
      const bar = new TestBar(BarId.ALERT);
      bar.render({ label: 'A', count: 1 });

      const clickHandler = getClickHandler()!;
      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:A:1')
      );

      bar.render({ label: 'B', count: 2 });
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('compact:B:2')
      );

      clickHandler();
      expect(mockRootEl.html).toHaveBeenLastCalledWith(
        expect.stringContaining('details:B:2')
      );
    });
  });

  // ── Compact-only mode (renderDetails returns null) ──

  /** Compact-only subclass: relies on default `renderDetails()` returning null. */
  class CompactOnlyBar extends BaseBar<TestData> {
    public render(data: TestData): void {
      super.render(data);
    }

    protected renderCompact(data: TestData): string {
      return `compact:${data.label}:${data.count}`;
    }

    // renderDetails intentionally omitted — inherits default null return

    protected async loadData(): Promise<TestData> {
      return { label: 'default', count: 0 };
    }

    protected resolveStatus(_data: TestData): BarStatus {
      return BarStatus.OK;
    }

    protected get refreshEvents(): readonly DomainEventType[] {
      return [];
    }
  }

  describe('compact-only mode (renderDetails returns null)', () => {
    it('should render compact HTML directly without disclosure button or details markup', () => {
      const bar = new CompactOnlyBar(BarId.ALERT);
      bar.render({ label: 'Simple', count: 3 });

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toBe('compact:Simple:3');
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('toggle');
    });

    it('should not bind a disclosure click handler', () => {
      const bar = new CompactOnlyBar(BarId.ALERT);
      bar.render({ label: 'NoClick', count: 1 });

      const clickCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === `click.${EVENT_NS}`
      );
      expect(clickCalls.length).toBe(0);
    });

    it('should still call onPaint for compact-only mode', () => {
      class CompactOnlyWithPaint extends CompactOnlyBar {
        public onPaintCount = 0;

        protected onPaint(): void {
          this.onPaintCount++;
        }
      }

      const bar = new CompactOnlyWithPaint(BarId.ALERT);
      bar.render({ label: 'Paint', count: 1 });

      expect(bar.onPaintCount).toBe(1);
    });

  });
});
