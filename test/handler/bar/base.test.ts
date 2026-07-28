import { BaseBar, IBaseBar } from '../../../src/handler/bar/base';

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

const mockJQuery = jest.fn((selector: string) => {
  if (selector === '#test-bar') {
    return mockRootEl;
  }
  return createMockElement();
});
(global as any).$ = mockJQuery;

// ── Concrete test subclass ──

interface TestData {
  label: string;
  count: number;
}

class TestBar extends BaseBar<TestData> {
  public compactCount = 0;
  public expandedCount = 0;

  constructor(rootSelector: string, options?: { rightSelector?: string; expandedClass?: string }) {
    super(rootSelector, options);
  }

  protected renderCompact(data: TestData): string {
    this.compactCount++;
    return `compact:${data.label}:${data.count}`;
  }

  protected renderExpanded(data: TestData): string {
    this.expandedCount++;
    return `expanded:${data.label}:${data.count}`;
  }
}

// Subclass with right-click handler
class TestBarWithRightClick extends BaseBar<TestData> {
  public lastRightClick: { event: JQuery.ContextMenuEvent; data: TestData } | null = null;

  constructor(rootSelector: string, rightSelector: string) {
    super(rootSelector, { rightSelector });
  }

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}`;
  }

  protected renderExpanded(data: TestData): string {
    return `expanded:${data.label}`;
  }

  protected onRightClick(event: JQuery.ContextMenuEvent, data: TestData): void {
    this.lastRightClick = { event, data };
  }
}

// Subclass with left-click handler
class TestBarWithLeftClick extends BaseBar<TestData> {
  public leftClickCount = 0;

  constructor(rootSelector: string) {
    super(rootSelector);
  }

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}`;
  }

  protected renderExpanded(data: TestData): string {
    return `expanded:${data.label}`;
  }

  protected onLeftClick(): void {
    this.leftClickCount++;
  }
}

// Subclass with async right-click handler
class TestBarWithAsyncRightClick extends BaseBar<TestData> {
  public lastRightClickData: TestData | null = null;

  constructor(rootSelector: string, rightSelector: string) {
    super(rootSelector, { rightSelector });
  }

  protected renderCompact(data: TestData): string {
    return `compact:${data.label}`;
  }

  protected renderExpanded(data: TestData): string {
    return `expanded:${data.label}`;
  }

  protected async onRightClick(_event: JQuery.ContextMenuEvent, data: TestData): Promise<void> {
    this.lastRightClickData = data;
  }
}

/** Helper to extract the delegated contextmenu handler (third arg). */
function getContextMenuHandler(): ((event: JQuery.ContextMenuEvent) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => c[0] === 'contextmenu.basebar'
  );
  return call?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;
}

// ── Tests ──

describe('BaseBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
  });

  describe('implements IBaseBar', () => {
    it('should satisfy the IBaseBar interface contract', () => {
      const bar: IBaseBar<TestData> = new TestBar('#test-bar');
      expect(typeof bar.render).toBe('function');
    });
  });

  describe('render', () => {
    it('should render compact HTML with the provided data', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'Alpha', count: 1 });

      expect(mockRootEl.html).toHaveBeenCalledWith('compact:Alpha:1');
    });

    it('should store the latest data for re-render', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'First', count: 10 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      expect(clickHandler).toBeDefined();
      clickHandler!();

      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:First:10');
    });

    it('should start in compact mode', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'X', count: 5 });

      expect(mockRootEl.html).toHaveBeenCalledTimes(1);
      expect(mockRootEl.html).toHaveBeenCalledWith('compact:X:5');
    });

  });

  describe('expanded state lifecycle', () => {
    it('should toggle between compact and expanded on root click', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'Toggle', count: 3 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      expect(clickHandler).toBeDefined();

      clickHandler!();
      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:Toggle:3');

      clickHandler!();
      expect(mockRootEl.html).toHaveBeenLastCalledWith('compact:Toggle:3');
    });

    it('should call subclass renderCompact and renderExpanded methods', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'Lifecycle', count: 7 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];

      expect(bar.compactCount).toBe(1);
      expect(bar.expandedCount).toBe(0);

      clickHandler!();
      expect(bar.expandedCount).toBe(1);

      clickHandler!();
      expect(bar.compactCount).toBe(2);
    });
  });

  describe('handler deduplication', () => {
    it('should call off then on for click on each render (dedup ordering)', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'Seq', count: 1 });

      // off('click') must be called, confirming handler removal before rebind
      const offClickCalls = mockRootEl.off.mock.calls.filter((c: any[]) => c[0] === 'click.basebar');
      const onClickCalls = mockRootEl.on.mock.calls.filter((c: any[]) => c[0] === 'click.basebar');

      expect(offClickCalls.length).toBe(1);
      expect(onClickCalls.length).toBe(1);

      // Second render adds another off+on pair
      bar.render({ label: 'Seq', count: 2 });

      const offClickCalls2 = mockRootEl.off.mock.calls.filter((c: any[]) => c[0] === 'click.basebar');
      const onClickCalls2 = mockRootEl.on.mock.calls.filter((c: any[]) => c[0] === 'click.basebar');

      expect(offClickCalls2.length).toBe(2);
      expect(onClickCalls2.length).toBe(2);
    });

    it('should not duplicate delegated right-click handlers after re-render', () => {
      const bar = new TestBarWithRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Dedup', count: 1 });
      bar.render({ label: 'Dedup', count: 2 });

      // off('contextmenu.basebar', selector) should be called before on('contextmenu.basebar', selector, handler)
      const offContextmenuCalls = mockRootEl.off.mock.calls.filter(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      );
      const onContextmenuCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      );

      expect(offContextmenuCalls.length).toBe(2);
      expect(onContextmenuCalls.length).toBe(2);

      // Only one handler active — the last one bound
      const handler = getContextMenuHandler();
      expect(handler).toBeDefined();
    });
  });

  describe('root left-click action', () => {
    it('should call onLeftClick when root is clicked and subclass provides it', () => {
      const bar = new TestBarWithLeftClick('#test-bar');
      bar.render({ label: 'Left', count: 1 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      expect(clickHandler).toBeDefined();

      clickHandler!();
      expect(bar.leftClickCount).toBe(1);
    });

    it('should toggle expanded state AND call onLeftClick', () => {
      const bar = new TestBarWithLeftClick('#test-bar');
      bar.render({ label: 'Both', count: 5 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];

      clickHandler!();
      expect(bar.leftClickCount).toBe(1);
      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:Both');

      clickHandler!();
      expect(bar.leftClickCount).toBe(2);
      expect(mockRootEl.html).toHaveBeenLastCalledWith('compact:Both');
    });
  });

  describe('delegated right-click action', () => {
    it('should not bind right-click when no rightSelector is provided', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'NoRight', count: 1 });

      const onEvents = mockRootEl.on.mock.calls.map((c: any[]) => c[0]);
      expect(onEvents).not.toContain('contextmenu.basebar');
    });

    it('should bind delegated right-click when rightSelector is provided', () => {
      const bar = new TestBarWithRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Right', count: 1 });

      const onContextmenuCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      );
      expect(onContextmenuCalls.length).toBe(1);
      // Delegated signature: (event, selector, handler)
      expect(onContextmenuCalls[0][1]).toBe('.action-item');
      expect(typeof onContextmenuCalls[0][2]).toBe('function');
    });

    it('should call preventDefault and stopPropagation on right-click event', () => {
      const bar = new TestBarWithRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Prevent', count: 1 });

      const contextMenuHandler = getContextMenuHandler();
      expect(contextMenuHandler).toBeDefined();

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should pass event and current data to onRightClick', () => {
      const bar = new TestBarWithRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Pass', count: 42 });

      const contextMenuHandler = getContextMenuHandler();

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(bar.lastRightClick).not.toBeNull();
      expect(bar.lastRightClick!.data).toEqual({ label: 'Pass', count: 42 });
      expect(bar.lastRightClick!.event).toBe(mockEvent);
    });

    it('should retain the latest data after a right-click', () => {
      const bar = new TestBarWithRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Rerender', count: 10 });

      const contextMenuHandler = getContextMenuHandler();

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();
      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:Rerender');
    });
  });

  describe('data retention across re-renders', () => {
    it('should use latest data for toggle after multiple renders', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'Old', count: 1 });
      bar.render({ label: 'New', count: 99 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:New:99');
    });

    it('should reset expanded state on each render call', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'A', count: 1 });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();
      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:A:1');

      bar.render({ label: 'B', count: 2 });
      expect(mockRootEl.html).toHaveBeenLastCalledWith('compact:B:2');

      clickHandler!();
      expect(mockRootEl.html).toHaveBeenLastCalledWith('expanded:B:2');
    });
  });



  describe('expandedClass', () => {
    it('should add expandedClass when expanded and remove when compact', () => {
      const bar = new TestBar('#test-bar', { expandedClass: 'is-open' });
      bar.render({ label: 'Cls', count: 1 });

      // Compact render: removeClass called
      expect(mockRootEl.removeClass).toHaveBeenCalledWith('is-open');

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      // Expanded render: addClass called
      expect(mockRootEl.addClass).toHaveBeenCalledWith('is-open');

      clickHandler!();

      // Back to compact: removeClass called again
      expect(mockRootEl.removeClass).toHaveBeenCalledWith('is-open');
    });

    it('should not touch class when expandedClass is not set', () => {
      const bar = new TestBar('#test-bar');
      bar.render({ label: 'NoCls', count: 1 });

      expect(mockRootEl.addClass).not.toHaveBeenCalled();
      expect(mockRootEl.removeClass).not.toHaveBeenCalled();
    });
  });

  describe('async onRightClick', () => {
    it('should invoke async onRightClick without error', async () => {
      const bar = new TestBarWithAsyncRightClick('#test-bar', '.action-item');
      bar.render({ label: 'Async', count: 1 });

      const contextMenuHandler = getContextMenuHandler();
      expect(contextMenuHandler).toBeDefined();

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 0));

      expect(bar.lastRightClickData).toEqual({ label: 'Async', count: 1 });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});
