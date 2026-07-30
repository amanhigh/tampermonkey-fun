/**
 * AlertSummaryBar contract tests (TDD red phase).
 *
 * Protects the AlertSummaryBar / IAlertSummaryBar public contract:
 *
 * Contract points under test:
 *  - IAlertSummaryBar exposes `refresh`, `registerEvents`
 *  - Compact-only mode: no disclosure shell, no aria/hidden markup
 *  - Loads current ticker through IDomManager
 *  - Compact rendering of empty, no-pair, low, high, pending, and multiple alerts
 *  - Delegated pill deletion by zero-based alert index with pending-alert protection
 *  - The four exact refresh events: TICKER_CHANGED, ALERTS_CHANGED,
 *    TICKER_METADATA_CHANGED, TICKER_TRACKING_STOPPED
 *  - Composite-error warning suppression
 *  - Non-composite warning on alert fetch failure
 *  - Category-lookup failure still leaving No Pair rendered
 */

import { AlertSummaryBar, IAlertSummaryBar } from '../../../src/handler/bar/alert_summary';
import { IDomManager } from '../../../src/manager/dom';
import { IAlertManager } from '../../../src/manager/alert';
import { ICategoryManager } from '../../../src/manager/category';
import { ITradingViewManager } from '../../../src/manager/tv';
import { Alert } from '../../../src/models/alert';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { WatchCategoryId } from '../../../src/models/watch';
import { BAR_CLASS, BarStatus } from '../../../src/models/bar';

// ── Constants ──

/**
 * Root selector for the AlertSummaryBar.
 * Follows the `#aman-alerts` BarId pattern.
 */
const ROOT = '#aman-alerts';
const NS = 'alerts';
const PILL_SELECTOR = `[data-${NS}-index]`;

/** BEM class names expected from the finalized AlertSummaryBar contract. */
const BEM = {
  PILL: 'aman-alerts__pill',
  PILL_LOW: 'aman-alerts__pill--low',
  PILL_HIGH: 'aman-alerts__pill--high',
  PILL_PENDING: 'aman-alerts__pill--pending',
  EMPTY: 'aman-alerts__empty',
  NO_PAIR: 'aman-alerts__no-pair',
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
    attr: jest.fn().mockReturnValue(undefined),
    length: 1,
  };
}

function createDefaultJQuery(selector: string): any {
  if (selector === ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

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

// ── Helpers ──

function getPillClickHandler(): ((event: any) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => c[0] === 'click' && c[1] === PILL_SELECTOR
  );
  return call?.[2] as ((event: any) => void) | undefined;
}

function simulatePillClick(index: number | undefined): void {
  const fakeDomEl = { nodeType: 1, tagName: 'BUTTON' };
  const mockWrappedEl = createMockElement();
  // data-alerts-index returns the zero-based index; undefined means missing attribute
  mockWrappedEl.attr.mockReturnValue(index !== undefined ? index : undefined);

  mockJQuery.mockImplementation((selector: any) => {
    if (selector === ROOT) return mockRootEl;
    if (selector === fakeDomEl) return mockWrappedEl;
    return createMockElement();
  });

  const clickHandler = getPillClickHandler();
  expect(clickHandler).toBeDefined();

  const event = { stopPropagation: jest.fn(), currentTarget: fakeDomEl };
  clickHandler!(event);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function createAlert(overrides: Partial<Alert> = {}): Alert {
  return new Alert(
    overrides.id ?? 'alert-id-1',
    overrides.pairId ?? 'pair1',
    overrides.price ?? 100,
    overrides.name ?? 'Test Alert'
  );
}

// ── Mock Factories ──

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

function createMockAlertManager(): jest.Mocked<IAlertManager> {
  return {
    getAllAlerts: jest.fn().mockResolvedValue([]),
    getAlerts: jest.fn().mockResolvedValue([]),
    getAlertsForTicker: jest.fn().mockResolvedValue([]),
    createAlertForCurrentTicker: jest.fn().mockResolvedValue({} as any),
    deleteAllAlerts: jest.fn().mockResolvedValue(undefined),
    deleteAlertsByPrice: jest.fn().mockResolvedValue(undefined),
    deleteAlert: jest.fn().mockResolvedValue(undefined),
    refreshAlerts: jest.fn().mockResolvedValue(0),
    createAlertClickEvent: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockCategoryManager(): jest.Mocked<ICategoryManager> {
  return {
    getTickerCategory: jest.fn().mockResolvedValue({
      watch: undefined,
      flag: undefined,
      isFno: false,
    }),
    recordWatchCategory: jest.fn().mockResolvedValue(undefined),
    recordFlagCategory: jest.fn().mockResolvedValue(undefined),
    getBatchCategory: jest.fn().mockResolvedValue(new Map()),
    evictTicker: jest.fn(),
    publishCategoryChanged: jest.fn().mockResolvedValue(undefined),
    toggleReadyState: jest.fn().mockResolvedValue(undefined),
    clearReadyState: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockTVManager(): jest.Mocked<ITradingViewManager> {
  return {
    getLastTradedPrice: jest.fn().mockReturnValue(200),
    getCursorPrice: jest.fn().mockResolvedValue(0),
    clipboardCopy: jest.fn(),
    toggleFlag: jest.fn(),
  } as any;
}

// ── Tests ──

describe('AlertSummaryBar', () => {
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockTVManager: jest.Mocked<ITradingViewManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockDomManager = createMockDomManager();
    mockAlertManager = createMockAlertManager();
    mockCategoryManager = createMockCategoryManager();
    mockTVManager = createMockTVManager();
    mockJQuery.mockImplementation(createDefaultJQuery);
  });

  // ── Interface contract ──

  describe('interface contract', () => {
    it('should expose refresh', () => {
      const bar: IAlertSummaryBar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      expect(typeof bar.refresh).toBe('function');
    });

    it('should expose registerEvents', () => {
      const bar: IAlertSummaryBar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  // ── Compact-only rendering ──

  describe('compact rendering', () => {
    it('should render No Alerts when alerts list is empty', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('No Alerts');
      expect(html).toContain(BEM.EMPTY);
    });

    it('should render No Pair when alerts is null', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('not found'));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.COMPOSITE, color: 'darkkhaki', label: 'Composite', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('No Pair');
      expect(html).toContain(BEM.NO_PAIR);
    });

    it('should render low pill when alert price is below LTP', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ price: 100 }),
      ]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain(BEM.PILL_LOW);
      expect(html).toContain('100');
      expect(html).toContain(BEM.PILL);
    });

    it('should render high pill when alert price is above LTP', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ price: 300 }),
      ]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain(BEM.PILL_HIGH);
      expect(html).toContain('300');
    });

    it('should render pending pill when alert id is empty', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: '', price: 150 }),
      ]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain(BEM.PILL_PENDING);
      expect(html).toContain('150');
    });

    it('should render multiple alert pills', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ price: 100 }),
        createAlert({ price: 300 }),
        createAlert({ id: '', price: 250 }),
      ]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      // Three pills present
      expect(html).toContain(BEM.PILL_LOW);
      expect(html).toContain(BEM.PILL_HIGH);
      expect(html).toContain(BEM.PILL_PENDING);
    });

    it('should omit disclosure/aria markup in compact-only mode', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('__toggle');
      expect(html).not.toContain('__details');
    });
  });

  // ── loadData reads current ticker ──

  describe('loadData', () => {
    it('should read current ticker through IDomManager', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockDomManager.getTicker.mockReturnValue('NSE:TCS');
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockAlertManager.getAlertsForTicker).toHaveBeenCalledWith('NSE:TCS');
    });

    it('should pass the ticker returned by IDomManager to IAlertManager', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockDomManager.getTicker.mockReturnValue('BSE:RELIANCE');
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      expect(mockAlertManager.getAlertsForTicker).toHaveBeenCalledWith('BSE:RELIANCE');
    });
  });

  // ── Pill deletion ──

  describe('pill deletion', () => {
    it('should delete non-pending alert via delegated pill click by zero-based index', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: 'alert-1', price: 100 }),
      ]);

      await bar.refresh();

      // Click pill at index 0 → should resolve to alert-1
      simulatePillClick(0);
      await flushMicrotasks();

      expect(mockAlertManager.deleteAlert).toHaveBeenCalledWith('alert-1');
      expect(Notifier.red).toHaveBeenCalledWith(expect.stringContaining('100'));
    });

    it('should warn when clicking a pending alert pill', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: '', price: 150 }),
      ]);

      await bar.refresh();

      // Click pill at index 0 → pending alert (id='')
      simulatePillClick(0);
      await flushMicrotasks();

      expect(Notifier.warn).toHaveBeenCalledWith('Pending alerts cannot be deleted');
      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });

    it('should not call deleteAlert when pill element has no data-alerts-index', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: 'alert-1', price: 100 }),
      ]);

      await bar.refresh();

      // Click pill with missing data-alerts-index attribute
      simulatePillClick(undefined);

      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });
  });

  // ── Refresh events ──

  describe('refreshEvents', () => {
    it('should subscribe to the four exact domain event types', () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [
          DomainEventType.TICKER_CHANGED,
          DomainEventType.ALERTS_CHANGED,
          DomainEventType.TICKER_METADATA_CHANGED,
          DomainEventType.TICKER_TRACKING_STOPPED,
        ],
        expect.any(Function)
      );
    });

    it('should not use subscribe for individual events', () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribe).not.toHaveBeenCalled();
    });

    it('should call refresh when a subscribed event fires', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      const callback = mockSubscriber.subscribeMany.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockAlertManager.getAlertsForTicker).toHaveBeenCalledWith('NSE:INFY');
    });
  });

  // ── Composite-error warning suppression ──

  describe('composite-error warning suppression', () => {
    it('should suppress console.warn for composite ticker on alert fetch failure', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('not found'));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.COMPOSITE, color: 'darkkhaki', label: 'Composite', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      await bar.refresh();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should still render No Pair when alert fetch fails for composite ticker', async () => {
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('not found'));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.COMPOSITE, color: 'darkkhaki', label: 'Composite', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('No Pair');
    });
  });

  // ── Non-composite warning ──

  describe('non-composite warning', () => {
    it('should warn when category is not composite and alert fetch fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('connection timeout'));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      await bar.refresh();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load alerts for NSE:INFY')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('connection timeout')
      );
      warnSpy.mockRestore();
    });
  });

  // ── Category-lookup failure ──

  describe('category-lookup failure', () => {
    it('should still render No Pair when category lookup also fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('alert service down'));
      mockCategoryManager.getTickerCategory.mockRejectedValue(new Error('category service down'));

      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('No Pair');
      warnSpy.mockRestore();
    });

    it('should warn when category lookup fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('alert error'));
      mockCategoryManager.getTickerCategory.mockRejectedValue(new Error('category error'));

      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      await bar.refresh();

      // Cannot determine composite, so warning is emitted
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load alerts for NSE:INFY')
      );
      warnSpy.mockRestore();
    });
  });

  // ── Status synchronization ──

  describe('status synchronization', () => {
    it('should apply BAR_CLASS to root element during render', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BAR_CLASS);
    });

    it('should apply ERROR status when alerts is null', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockRejectedValue(new Error('not found'));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.COMPOSITE, color: 'darkkhaki', label: 'Composite', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should apply ERROR status when alerts list is empty', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockAlertManager.getAlertsForTicker.mockResolvedValue([]);

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should apply WARN status when any pending alert exists', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: 'alert-1', price: 100 }),
        createAlert({ id: '', price: 150 }),
      ]);

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.WARN}`);
    });

    it('should apply OK status when all alerts are persisted', async () => {
      const bar = new AlertSummaryBar(
        mockAlertManager, mockCategoryManager, mockTVManager, mockDomManager
      );
      mockTVManager.getLastTradedPrice.mockReturnValue(200);
      mockAlertManager.getAlertsForTicker.mockResolvedValue([
        createAlert({ id: 'alert-1', price: 100 }),
        createAlert({ id: 'alert-2', price: 300 }),
      ]);

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });
  });
});
