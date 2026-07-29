import { TimeFrameBar, ITimeFrameHandler } from '../../../src/handler/bar/timeframe';
import { ITimeFrameManager } from '../../../src/manager/timeframe';
import { TickerTimeframe } from '../../../src/models/timeframe';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { Notifier } from '../../../src/util/notify';
import { BarId } from '../../../src/models/bar';

// ── Constants ──

const TF_ROOT = `#${BarId.TIMEFRAME}`; // #aman-tf-bar
const CHIP_SELECTOR = '.aman-tf-bar__chip';

/** BEM class names expected from the finalized BaseBar/TimeFrameBar contract. */
const BEM = {
  ROOT: 'aman-tf-bar',
  CHIP: 'aman-tf-bar__chip',
  ACTIVE: 'aman-tf-bar__chip--active',
  INACTIVE: 'aman-tf-bar__chip--inactive',
  LOADING: 'aman-tf-bar__chip--loading',
} as const;

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
    attr: jest.fn().mockReturnValue(undefined),
    length: 1,
  };
}

function createDefaultJQuery(selector: string): any {
  if (selector === TF_ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

// ── Mock Notifier ──
jest.mock('../../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

// ── Helpers ──

/**
 * Finds the chip click handler bound via delegated `click` event
 * on the chip selector. Returns undefined if not found.
 */
function getChipClickHandler(): ((event: any) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => c[0] === 'click' && c[1] === CHIP_SELECTOR
  );
  return call?.[2] as ((event: any) => void) | undefined;
}

/**
 * Simulates a click on a timeframe chip by invoking the delegated click handler.
 */
function simulateChipClick(attrValue: string | undefined): void {
  const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
  const mockWrappedEl = createMockElement();
  mockWrappedEl.attr.mockReturnValue(attrValue);

  // Override $(DOM_element) to return our mock wrapped element
  mockJQuery.mockImplementation((selector: any) => {
    if (selector === TF_ROOT) return mockRootEl;
    if (selector === fakeDomEl) return mockWrappedEl;
    return createMockElement();
  });

  const clickHandler = getChipClickHandler();
  expect(clickHandler).toBeDefined();

  const event = { stopPropagation: jest.fn(), currentTarget: fakeDomEl };
  clickHandler!(event);
}

/**
 * Flushes pending microtasks so fire-and-forget async work completes.
 */
async function flushMicrotasks(): Promise<void> {
  // Each await drains one level of the microtask queue.
  // The fire-and-forget handleChipClick chain needs:
  //   1. rejection → catch → Notifier.warn → await refresh()
  //   2. await loadData() → resolve → render() → paint() → $root.html()
  // Extra ticks guard against deeper chains.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ── Tests ──

describe('TimeFrameBar', () => {
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockJQuery.mockImplementation(createDefaultJQuery);

    mockTimeFrameManager = {
      apply: jest.fn(),
      getCurrentConfig: jest.fn(),
      getActiveTimeframes: jest.fn().mockResolvedValue(['TMN', 'MN', 'WK', 'DL']),
      getSequence: jest.fn(),
      toggleTimeframe: jest.fn(),
    } as any;
  });

  describe('interface contract', () => {
    it('should satisfy ITimeFrameHandler interface without exposing render', () => {
      const bar: ITimeFrameHandler = new TimeFrameBar(mockTimeFrameManager);
      expect(typeof bar.refresh).toBe('function');
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  describe('refresh (compact chips)', () => {
    it('should render all six timeframe chips in YR to DL order', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain('YR');
      expect(html).toContain('SMN');
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');

      const yrIndex = html.indexOf('YR');
      const dlIndex = html.indexOf('DL');
      expect(yrIndex).toBeLessThan(dlIndex);
    });

    it('should mark backend-active chips with active class', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain(BEM.ACTIVE);
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');
    });

    it('should mark non-backend chips with inactive class', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain(BEM.INACTIVE);
    });

    it('should include tooltip text on every chip', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      const expectedTooltip = 'Recommended timeframe for this ticker. Click to add/remove.';

      expect(html).toContain(expectedTooltip);
    });

    it('should do nothing when bar element is not found', async () => {
      mockRootEl = { length: 0 };
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      expect(mockRootEl.html).toBeUndefined();
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to both timeframe refresh events through subscribeMany', () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [DomainEventType.TICKER_CHANGED, DomainEventType.TICKER_TIMEFRAMES_CHANGED],
        expect.any(Function)
      );
      expect(mockSubscriber.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('chip click handling', () => {
    it('should toggle active chip through TimeFrameManager', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      simulateChipClick(TickerTimeframe.WK);

      expect(mockTimeFrameManager.toggleTimeframe).toHaveBeenCalledWith(TickerTimeframe.WK);
    });

    it('should stop event propagation to prevent display card toggle', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
      const mockWrappedEl = createMockElement();
      mockWrappedEl.attr.mockReturnValue('WK');

      mockJQuery.mockImplementation((selector: any) => {
        if (selector === TF_ROOT) return mockRootEl;
        if (selector === fakeDomEl) return mockWrappedEl;
        return createMockElement();
      });

      const stopPropagation = jest.fn();
      const clickHandler = getChipClickHandler()!;
      clickHandler({ stopPropagation, currentTarget: fakeDomEl });

      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should show warning and re-render when toggle fails', async () => {
      mockTimeFrameManager.toggleTimeframe.mockRejectedValue(
        new Error('Network error')
      );

      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      mockRootEl.html.mockClear();

      simulateChipClick('WK');

      // Flush microtasks so the async handler completes
      await flushMicrotasks();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle timeframe WK')
      );
      // Error path calls refresh() → render() (no event published on failure)
      expect(mockRootEl.html).toHaveBeenCalled();
    });

    it('should do nothing when chip has no data-code attribute', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      simulateChipClick(undefined);

      expect(mockTimeFrameManager.toggleTimeframe).not.toHaveBeenCalled();
    });
  });

  describe('root class synchronization', () => {
    it('should apply block class to root element during render', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BEM.ROOT);
    });
  });

  describe('compact-only mode', () => {
    it('should render compact chips without disclosure button or details/aria markup', async () => {
      const bar = new TimeFrameBar(mockTimeFrameManager);
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // Should contain chips but no disclosure shell
      expect(html).toContain(BEM.CHIP);
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('toggle');
      expect(html).not.toContain('__toggle');
      expect(html).not.toContain('__details');
    });
  });
});
