import { AlertBar, IAlertBar, AlertBarData } from '../../../src/handler/bar/alert';
import { AlertTicker } from '../../../src/models/alert_ticker';
import { IDomManager } from '../../../src/manager/dom';
import { IAlertTickerManager } from '../../../src/manager/alert_ticker';
import { IUIUtil } from '../../../src/util/ui';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { ApiError, wrapClientError } from '../../../src/models/api_error';
import { BarId, BAR_CLASS, BarStatus } from '../../../src/models/bar';

// ── Constants ──

const ALERT_ROOT = `#${BarId.ALERT}`; // #aman-alert-ticker-bar
const EVENT_NS = 'bar-alert-ticker';

/** BEM class names expected from the finalized BaseBar/AlertBar contract. */
const BEM = {
  EXPANDED: 'aman-alert-ticker-bar--expanded',
  DETAILS: 'aman-alert-ticker-bar__details',
  COUNT: 'aman-alert-ticker-bar__count',
  ROW: 'aman-alert-ticker-bar__row',
  ROW_PRIMARY: 'aman-alert-ticker-bar__row--primary',
  ROW_SECONDARY: 'aman-alert-ticker-bar__row--secondary',
  EMPTY: 'aman-alert-ticker-bar__empty',
} as const;

/** Expected status modifier class names from the approved status contract. */
const STATUS = {
  OK: `${BAR_CLASS}--${BarStatus.OK}`,
  WARN: `${BAR_CLASS}--${BarStatus.WARN}`,
  ERROR: `${BAR_CLASS}--${BarStatus.ERROR}`,
  ALL: `${BAR_CLASS}--${BarStatus.OK} ${BAR_CLASS}--${BarStatus.WARN} ${BAR_CLASS}--${BarStatus.ERROR}`,
} as const;

const DETAILS_ID = 'aman-alert-ticker-bar-details';

// ── Mock Notifier ──

jest.mock('../../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

const { Notifier } = jest.requireMock('../../../src/util/notify');

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
    attr: jest.fn().mockReturnValue(undefined),
    length: 1,
  };
}

function createDefaultJQuery(selector: string): any {
  if (selector === ALERT_ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

// ── Helpers ──

function getClickHandler(): (() => void) | undefined {
  const call = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === `click.${EVENT_NS}`);
  return call?.[2] as (() => void) | undefined;
}

function getContextMenuHandler(): ((event: JQuery.ContextMenuEvent) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === `contextmenu.${EVENT_NS}`);
  return call?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;
}

function createAlertTicker(overrides: Partial<AlertTicker>): AlertTicker {
  return {
    symbol: 'INFY',
    pair_id: '123',
    name: 'Infosys',
    exchange: 'NSE',
    type: 'PRIMARY',
    ticker: 'NSE:INFY',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

function createMockDomManager(): jest.Mocked<IDomManager> {
  return {
    getTicker: jest.fn().mockReturnValue('NSE:INFY'),
    getName: jest.fn().mockReturnValue('Infosys'),
    getCurrentExchange: jest.fn().mockReturnValue('NSE'),
    openTicker: jest.fn().mockResolvedValue(undefined),
    getTickers: jest.fn().mockReturnValue(new Set()),
    isScreenerVisible: jest.fn().mockReturnValue(false),
    openBenchmarkTicker: jest.fn().mockResolvedValue(undefined),
    navigateTickers: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockAlertTickerManager(): jest.Mocked<IAlertTickerManager> {
  return {
    linkAlertTicker: jest.fn(),
    getPrimaryAlertTicker: jest.fn(),
    fetchAlertTicker: jest.fn(),
    getAlertTickers: jest.fn(),
    getAlertTickersForTicker: jest.fn().mockResolvedValue([]),
    deleteAlertTicker: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockUIUtil(): jest.Mocked<IUIUtil> {
  return {
    buildArea: jest.fn().mockReturnValue(createMockElement()),
    buildWrapper: jest.fn().mockReturnValue(createMockElement()),
    buildInput: jest.fn().mockReturnValue(createMockElement()),
    buildLabel: jest.fn().mockReturnValue(createMockElement()),
    toggleUI: jest.fn(),
    buildButton: jest.fn().mockReturnValue(createMockElement()),
    buildCheckBox: jest.fn().mockReturnValue(createMockElement()),
    buildRadio: jest.fn().mockReturnValue(createMockElement()),
    colorText: jest.fn().mockImplementation((text) => text),
    showConfirm: jest.fn().mockReturnValue(true),
    buildBar: jest.fn().mockReturnValue(createMockElement()),
  };
}

// ── Test-only subclass exposing protected render ──

/** Test-only wrapper exposing protected `render(data)` for direct data application. */
class TestableAlertBar extends AlertBar {
  public render(data: AlertBarData): void {
    super.render(data);
  }
}

// ── Tests ──

describe('AlertBar', () => {
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockDomManager = createMockDomManager();
    mockAlertTickerManager = createMockAlertTickerManager();
    mockUIUtil = createMockUIUtil();
    mockJQuery.mockImplementation(createDefaultJQuery);
  });

  // ── Interface contract ──

  describe('interface contract', () => {
    it('should satisfy the IAlertBar interface without exposing render', () => {
      const bar: IAlertBar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      expect(typeof bar.refresh).toBe('function');
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  // ── refresh() ──

  describe('refresh', () => {
    it('should read current ticker and load linked alert tickers', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      const tickers = [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })];
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(tickers);

      await bar.refresh();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('NSE:INFY');
      expect(mockRootEl.html).toHaveBeenCalledWith(expect.stringContaining('🔗 INFY'));
    });

    it('should call render with isUntracked false on success', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await bar.refresh();

      // Verify the bar rendered the unmapped state (no tickers, not untracked)
      expect(mockRootEl.html).toHaveBeenCalledWith(expect.stringContaining('⚠️ NSE:INFY'));
      expect(mockRootEl.html).not.toHaveBeenCalledWith(expect.stringContaining('Untracked'));
    });

    it('should produce isUntracked true when ApiError 404 is thrown', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:BHEL');
      const apiError = new ApiError(404, 'Ticker not found');
      const wrapped = wrapClientError(apiError, 'Failed to list all Alert tickers');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(wrapped);

      await bar.refresh();

      expect(mockRootEl.html).toHaveBeenCalledWith(expect.stringContaining('Untracked'));
      expect(mockRootEl.html).toHaveBeenCalledWith(expect.stringContaining('NSE:BHEL'));
    });

    it('should rethrow non-404 errors and not render', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(bar.refresh()).rejects.toThrow('500 Internal Server Error');
      expect(mockRootEl.html).not.toHaveBeenCalled();
    });
  });

  // ── registerEvents() ──

  describe('registerEvents', () => {
    it('should subscribe to five domain event types including TICKER_TRACKING_STARTED', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [
          DomainEventType.TICKER_CHANGED,
          DomainEventType.TICKER_TRACKING_STARTED,
          DomainEventType.TICKER_TRACKING_STOPPED,
          DomainEventType.ALERT_TICKER_LINKED,
          DomainEventType.ALERT_TICKER_DELETED,
        ],
        expect.any(Function)
      );
    });

    it('should invoke refresh when TICKER_TRACKING_STARTED fires', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      // Verify TICKER_TRACKING_STARTED is in the subscribed events
      const subscribedEvents = mockSubscriber.subscribeMany.mock.calls[0][0] as DomainEventType[];
      expect(subscribedEvents).toContain(DomainEventType.TICKER_TRACKING_STARTED);

      // Invoke the callback and verify refresh (loadData) is called
      const callback = mockSubscriber.subscribeMany.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('NSE:INFY');
      expect(mockRootEl.html).toHaveBeenCalled();
    });


  });

  // ── Context-menu delink via direct dependencies ──

  describe('context-menu delink', () => {
    it('should validate row attributes, ask confirm, and delete via alertTickerManager', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();
      expect(contextMenuHandler).toBeDefined();

      // Mock currentTarget with valid attr values
      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      // Allow async to flush
      await new Promise((r) => setTimeout(r, 0));

      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith(expect.stringContaining('Delink'));
      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith(expect.stringContaining('INFY'));
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY', 'NSE:INFY');
      expect(Notifier.success).toHaveBeenCalledWith(expect.stringContaining('INFY'));
    });

    it('should use SECONDARY type in delink', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY2';
        if (name === 'data-alert-ticker-type') return 'SECONDARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);
      await new Promise((r) => setTimeout(r, 0));

      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY2', 'NSE:INFY');
    });

    it('should report failure when deleteAlertTicker throws', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockUIUtil.showConfirm.mockReturnValue(true);
      mockAlertTickerManager.deleteAlertTicker.mockRejectedValue(new Error('Not found'));

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);
      await new Promise((r) => setTimeout(r, 0));

      expect(Notifier.warn).toHaveBeenCalledWith(expect.stringContaining('Failed'));
    });

    it('should no-op when user cancels confirm dialog', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      mockUIUtil.showConfirm.mockReturnValue(false);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
    });

    it('should no-op when symbol attribute is missing', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(mockUIUtil.showConfirm).not.toHaveBeenCalled();
      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
    });

    it('should no-op when type attribute is missing', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(mockUIUtil.showConfirm).not.toHaveBeenCalled();
      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
    });

    it('should no-op when type attribute is invalid', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'INVALID';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);

      expect(mockUIUtil.showConfirm).not.toHaveBeenCalled();
      expect(mockAlertTickerManager.deleteAlertTicker).not.toHaveBeenCalled();
    });

    it('should use rendered tvTicker for delink, not current domManager ticker', async () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);

      // Render data for ticker A
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = getContextMenuHandler();

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === ALERT_ROOT) return mockRootEl;
        return mockTarget;
      });

      // domManager now returns a different ticker B — simulates stale row
      mockDomManager.getTicker.mockReturnValue('NSE:TCS');
      mockUIUtil.showConfirm.mockReturnValue(true);

      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        currentTarget: {},
      } as unknown as JQuery.ContextMenuEvent;

      contextMenuHandler!(mockEvent);
      await new Promise((r) => setTimeout(r, 0));

      // deleteAlertTicker must receive the rendered ticker A, not the current ticker B
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY', 'NSE:INFY');
    });
  });

  // ── Compact output ──

  describe('compact output', () => {
    it('should render mapped ticker with link emoji and alert count', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY' })],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔗 INFY')
      );
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining(`class="${BEM.COUNT}"`)
      );
    });

    it('should render unmapped ticker with warning emoji and zero count', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ NSE:BHEL')
      );
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔔0')
      );
    });

    it('should render untracked ticker with Untracked label', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: true,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('Untracked · NSE:BHEL')
      );
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔔0')
      );
    });

    it('should use primary symbol as display ticker when mapped', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:TV_TICKER',
        alertTickers: [createAlertTicker({ symbol: 'INVESTING_SYM', type: 'PRIMARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔗 INVESTING_SYM')
      );
    });

    it('should show correct count for multiple linked tickers', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [
          createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' }),
          createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY', pair_id: '456' }),
        ],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔔2')
      );
    });
  });

  // ── Root status classes ──

  describe('status classes', () => {
    it('should apply OK status when primary ticker is linked', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ type: 'PRIMARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith(STATUS.ALL);
      expect(mockRootEl.addClass).toHaveBeenCalledWith(STATUS.OK);
    });

    it('should apply WARN status when tracked without primary', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith(STATUS.ALL);
      expect(mockRootEl.addClass).toHaveBeenCalledWith(STATUS.WARN);
    });

    it('should apply WARN status when only secondary tickers present', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ type: 'SECONDARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith(STATUS.ALL);
      expect(mockRootEl.addClass).toHaveBeenCalledWith(STATUS.WARN);
    });

    it('should apply ERROR status when untracked', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: true,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith(STATUS.ALL);
      expect(mockRootEl.addClass).toHaveBeenCalledWith(STATUS.ERROR);
    });
  });

  // ── Expanded output ──

  describe('expanded output', () => {
    it('should include compact header and BaseBar-owned details wrapper', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY' })],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('🔗 INFY ·');
      expect(lastHtml).toContain(`id="${DETAILS_ID}"`);
      expect(lastHtml).toContain(`class="${BEM.DETAILS}"`);
    });

    it('should not include details content before expansion', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY', exchange: 'NSE', name: 'Infosys' })],
        isUntracked: false,
      });

      const initialHtml = mockRootEl.html.mock.calls[0][0];
      expect(initialHtml).toContain('hidden');
      // Detail rows (⭐) should NOT be in the initial render
      expect(initialHtml).not.toContain('⭐ INFY');
    });

    it('should render primary row with star emoji and data attributes', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY', exchange: 'NSE', name: 'Infosys' })],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain(`${BEM.ROW} ${BEM.ROW_PRIMARY}`);
      expect(lastHtml).toContain('data-alert-ticker-symbol="INFY"');
      expect(lastHtml).toContain('data-alert-ticker-type="PRIMARY"');
      expect(lastHtml).toContain('data-alert-ticker-context-action');
      expect(lastHtml).toContain('⭐ INFY · NSE · Infosys');
    });

    it('should render secondary row with diamond emoji', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY', exchange: 'BSE', name: 'Infosys Ltd' })],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain(`${BEM.ROW} ${BEM.ROW_SECONDARY}`);
      expect(lastHtml).toContain('data-alert-ticker-symbol="INFY2"');
      expect(lastHtml).toContain('data-alert-ticker-type="SECONDARY"');
      expect(lastHtml).toContain('data-alert-ticker-context-action');
      expect(lastHtml).toContain('🔹 INFY2 · BSE · Infosys Ltd');
    });

    it('should omit exchange and name when not provided', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', exchange: '', name: '' })],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('⭐ INFY</div>');
      expect(lastHtml).not.toContain('· NSE');
      expect(lastHtml).not.toContain('· Infosys');
    });
  });

  // ── Empty and untracked expanded states ──

  describe('empty and untracked expanded states', () => {
    it('should show empty state message when no tickers and not untracked', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain(BEM.EMPTY);
      expect(lastHtml).toContain('No linked alert tickers');
    });

    it('should show untracked expanded message when untracked', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: true,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain(BEM.EMPTY);
      expect(lastHtml).toContain('Untracked ticker — no backend record');
    });
  });

  // ── Constructor configuration ──

  // ── HTML escaping ──

  describe('HTML escaping', () => {
    it('should escape HTML metacharacters in expanded ticker rows', () => {
      const bar = new TestableAlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:TEST',
        alertTickers: [
          createAlertTicker({
            symbol: '<script>alert("xss")</script>',
            type: 'PRIMARY',
            exchange: 'NSE&BSE',
            name: 'Test <img onerror="xss">',
          }),
        ],
        isUntracked: false,
      });

      const clickHandler = getClickHandler()!;
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];

      // Raw tags must not appear in rendered HTML
      expect(lastHtml).not.toContain('<script>');
      expect(lastHtml).not.toContain('<img');

      // Escaped forms must be present
      expect(lastHtml).toContain('&lt;script&gt;');
      expect(lastHtml).toContain('NSE&amp;BSE');
      expect(lastHtml).toContain('&lt;img onerror=&quot;xss&quot;&gt;');
    });
  });
});
