import { TimeFrameHandler } from '../../src/handler/timeframe';
import { ITimeFrameManager } from '../../src/manager/timeframe';
import { TickerTimeframe } from '../../src/models/timeframe';
import { ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';
import { Notifier } from '../../src/util/notify';

// ── Mock jQuery ──

/**
 * Creates a jQuery-like mock element with chainable methods.
 */
function makeJQueryEl(overrides: Record<string, any> = {}): any {
  return {
    html: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    attr: jest.fn(),
    addClass: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

let mockBarEl: any;
// Stores the most recently created jQuery-wrapped element from $(DOM_ELEMENT)
let mockWrappedEl: any;

const mockJQuery = jest.fn((selector: any) => {
  if (selector === '#aman-tf-bar') {
    return mockBarEl;
  }
  // For $(DOM_Element) calls (from e.currentTarget wrapping)
  // Return a configurable mock jQuery object
  return mockWrappedEl || makeJQueryEl();
});
(global as any).$ = mockJQuery;

// ── Mock Notifier ──
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
  },
}));

/**
 * Flushes pending microtasks so fire-and-forget async work completes.
 */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

describe('TimeFrameHandler', () => {
  let handler: TimeFrameHandler;
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBarEl = {
      html: jest.fn().mockReturnThis(),
      off: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    };

    // Default wrapped element returns no code (no-op for safety)
    mockWrappedEl = makeJQueryEl({ attr: jest.fn().mockReturnValue(undefined) });

    mockTimeFrameManager = {
      applyTimeFrame: jest.fn(),
      getCurrentTimeFrameConfig: jest.fn(),
      getTimeframeCodes: jest.fn().mockReturnValue([
        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN,
        TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]),
      getExactTimeframesForCurrentTicker: jest.fn().mockResolvedValue(['TMN', 'MN', 'WK', 'DL']),
      getSequenceForCurrentTicker: jest.fn(),
      toggleTimeframeForCurrentTicker: jest.fn(),
    } as any;

    handler = new TimeFrameHandler(mockTimeFrameManager);
  });

  describe('render', () => {
    it('should render all six timeframe chips in YR to DL order', async () => {
      await handler.render();

      const html = mockBarEl.html.mock.calls[0][0];

      // All chips should appear in order
      expect(html).toContain('YR');
      expect(html).toContain('SMN');
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');

      // YR should come before SMN, etc.
      const yrIndex = html.indexOf('YR');
      const dlIndex = html.indexOf('DL');
      expect(yrIndex).toBeLessThan(dlIndex);
    });

    it('should mark backend-active chips with active class', async () => {
      mockTimeFrameManager.getExactTimeframesForCurrentTicker.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      await handler.render();

      const html = mockBarEl.html.mock.calls[0][0];

      expect(html).toContain('aman-tf-active');
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');
    });

    it('should mark non-backend chips with inactive class', async () => {
      mockTimeFrameManager.getExactTimeframesForCurrentTicker.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      await handler.render();

      const html = mockBarEl.html.mock.calls[0][0];

      expect(html).toContain('aman-tf-inactive');
    });

    it('should include tooltip text on every chip', async () => {
      await handler.render();

      const html = mockBarEl.html.mock.calls[0][0];
      const expectedTooltip = 'Recommended timeframe for this ticker. Click to add/remove.';

      expect(html).toContain(expectedTooltip);
    });

    it('should do nothing when bar element is not found', async () => {
      mockBarEl = { length: 0 };
      const warnSpy = jest.spyOn(Notifier, 'warn');

      await handler.render();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to TICKER_CHANGED', () => {
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
        DomainEventType.TICKER_CHANGED,
        expect.any(Function)
      );
    });

    it('should subscribe to TICKER_TIMEFRAMES_CHANGED', () => {
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
        DomainEventType.TICKER_TIMEFRAMES_CHANGED,
        expect.any(Function)
      );
    });
  });

  describe('chip click handling', () => {
    /**
     * Simulates a click on a timeframe chip by invoking the delegated click handler
     * with a mock event whose currentTarget resolves to the given fake chip element.
     */
    function simulateChipClick(attrValue: string | undefined): void {
      const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };

      mockWrappedEl = makeJQueryEl({
        attr: jest.fn().mockReturnValue(attrValue),
        addClass: jest.fn().mockReturnThis(),
      });

      const clickHandler = mockBarEl.on.mock.calls[0][2];
      const event = { stopPropagation: jest.fn(), currentTarget: fakeDomEl };

      // The handler calls $(e.currentTarget) → returns mockWrappedEl
      clickHandler(event);
    }

    it('should toggle active chip through TimeFrameManager', async () => {
      await handler.render();

      simulateChipClick(TickerTimeframe.WK);

      expect(mockTimeFrameManager.toggleTimeframeForCurrentTicker).toHaveBeenCalledWith(TickerTimeframe.WK);
    });

    it('should stop event propagation to prevent display card toggle', async () => {
      await handler.render();

      const stopPropagation = jest.fn();
      mockWrappedEl = makeJQueryEl({
        attr: jest.fn().mockReturnValue('WK'),
        addClass: jest.fn().mockReturnThis(),
      });

      const clickHandler = mockBarEl.on.mock.calls[0][2];
      clickHandler({ stopPropagation, currentTarget: { nodeType: 1 } });

      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should show warning and re-render when toggle fails', async () => {
      mockTimeFrameManager.toggleTimeframeForCurrentTicker.mockRejectedValue(
        new Error('Network error')
      );

      await handler.render();

      mockBarEl.html.mockClear();

      simulateChipClick('WK');

      // Flush microtasks so the async handler completes
      await flushMicrotasks();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle timeframe WK')
      );
      // Error path calls render() directly (no event published on failure)
      expect(mockBarEl.html).toHaveBeenCalled();
    });

    it('should do nothing when chip has no data-code attribute', async () => {
      await handler.render();

      simulateChipClick(undefined);

      expect(mockTimeFrameManager.toggleTimeframeForCurrentTicker).not.toHaveBeenCalled();
    });
  });
});
