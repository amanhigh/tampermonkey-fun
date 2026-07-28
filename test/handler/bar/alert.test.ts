import { AlertBar, IAlertBar } from '../../../src/handler/bar/alert';
import { AlertTicker } from '../../../src/models/alert_ticker';
import { IDomManager } from '../../../src/manager/dom';
import { IAlertTickerManager } from '../../../src/manager/alert_ticker';
import { IUIUtil } from '../../../src/util/ui';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { ApiError, wrapClientError } from '../../../src/models/api_error';

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

const defaultJQueryImpl = (selector: string) => {
  if (selector === '#aman-display') {
    return mockRootEl;
  }
  return createMockElement();
};
const mockJQuery = jest.fn(defaultJQueryImpl);
(global as any).$ = mockJQuery;

// ── Helpers ──

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
  };
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
    mockJQuery.mockImplementation(defaultJQueryImpl);
  });

  describe('interface contract', () => {
    it('should satisfy the IAlertBar interface', () => {
      const bar: IAlertBar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      expect(typeof bar.render).toBe('function');
      expect(typeof bar.refresh).toBe('function');
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  // ── refresh() ──

  describe('refresh', () => {
    it('should read current ticker and load linked alert tickers', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      const tickers = [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })];
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue(tickers);

      await bar.refresh();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('NSE:INFY');
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('🔗 INFY')
      );
    });

    it('should call render with isUntracked false on success', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);

      await bar.refresh();

      // Verify the bar rendered the unmapped state (no tickers, not untracked)
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ NSE:INFY')
      );
      expect(mockRootEl.html).not.toHaveBeenCalledWith(
        expect.stringContaining('Untracked')
      );
    });

    it('should produce isUntracked true when ApiError 404 is thrown', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:BHEL');
      const apiError = new ApiError(404, 'Ticker not found');
      const wrapped = wrapClientError(apiError, 'Failed to list all Alert tickers');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(wrapped);

      await bar.refresh();

      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('Untracked')
      );
      expect(mockRootEl.html).toHaveBeenCalledWith(
        expect.stringContaining('NSE:BHEL')
      );
    });

    it('should rethrow non-404 errors and not render', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:BHEL');
      mockAlertTickerManager.getAlertTickersForTicker.mockRejectedValue(
        new Error('500 Internal Server Error')
      );

      await expect(bar.refresh()).rejects.toThrow('500 Internal Server Error');
      expect(mockRootEl.html).not.toHaveBeenCalled();
    });
  });

  // ── registerEvents() ──

  describe('registerEvents', () => {
    it('should subscribe to four domain event types', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [
          DomainEventType.TICKER_CHANGED,
          DomainEventType.TICKER_TRACKING_STOPPED,
          DomainEventType.ALERT_TICKER_LINKED,
          DomainEventType.ALERT_TICKER_DELETED,
        ],
        expect.any(Function)
      );
    });

    it('should call refresh when any subscribed event fires', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      mockDomManager.getTicker.mockReturnValue('NSE:INFY');
      mockAlertTickerManager.getAlertTickersForTicker.mockResolvedValue([]);
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      const callback = mockSubscriber.subscribeMany.mock.calls[0][1] as () => Promise<void>;
      await callback();

      expect(mockAlertTickerManager.getAlertTickersForTicker).toHaveBeenCalledWith('NSE:INFY');
      expect(mockRootEl.html).toHaveBeenCalled();
    });
  });

  // ── Context-menu delink via direct dependencies ──

  describe('context-menu delink', () => {
    it('should validate row attributes, ask confirm, and delete via alertTickerManager', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;
      expect(contextMenuHandler).toBeDefined();

      // Mock currentTarget with valid attr values
      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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

      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Delink'),
      );
      expect(mockUIUtil.showConfirm).toHaveBeenCalledWith(
        expect.stringContaining('INFY'),
      );
      expect(mockAlertTickerManager.deleteAlertTicker).toHaveBeenCalledWith('INFY', 'NSE:INFY');
      expect(Notifier.success).toHaveBeenCalledWith(expect.stringContaining('INFY'));
    });

    it('should use SECONDARY type in delink', async () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY2';
        if (name === 'data-alert-ticker-type') return 'SECONDARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-type') return 'PRIMARY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const contextMenuHandler = mockRootEl.on.mock.calls.find(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      )?.[2] as ((event: JQuery.ContextMenuEvent) => void) | undefined;

      const mockTarget = createMockElement();
      mockTarget.attr.mockImplementation((name: string) => {
        if (name === 'data-alert-ticker-symbol') return 'INFY';
        if (name === 'data-alert-ticker-type') return 'INVALID';
        return undefined;
      });
      mockJQuery.mockImplementation((selector: string) => {
        if (selector === '#aman-display') return mockRootEl;
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
  });

  // ── Compact output (preserved from existing) ──

  describe('compact output', () => {
    it('should render mapped ticker with link emoji and alert count', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY' })],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        '🔗 INFY · <span class="aman-display-alert-count">🔔1</span>'
      );
    });

    it('should render unmapped ticker with warning emoji and zero count', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        '⚠️ NSE:BHEL · <span class="aman-display-alert-count">🔔0</span>'
      );
    });

    it('should render untracked ticker with Untracked label', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: true,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        '⚠️ Untracked · NSE:BHEL · <span class="aman-display-alert-count">🔔0</span>'
      );
    });

    it('should use primary symbol as display ticker when mapped', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:TV_TICKER',
        alertTickers: [createAlertTicker({ symbol: 'INVESTING_SYM', type: 'PRIMARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        '🔗 INVESTING_SYM · <span class="aman-display-alert-count">🔔1</span>'
      );
    });

    it('should show correct count for multiple linked tickers', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [
          createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' }),
          createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY', pair_id: '456' }),
        ],
        isUntracked: false,
      });

      expect(mockRootEl.html).toHaveBeenCalledWith(
        '🔗 INFY · <span class="aman-display-alert-count">🔔2</span>'
      );
    });
  });

  // ── Root classes (preserved from existing) ──

  describe('root classes', () => {
    it('should apply mapped class when primary ticker exists', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ type: 'PRIMARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockRootEl.addClass).toHaveBeenCalledWith('aman-display-mapped');
    });

    it('should apply unmapped class when no tickers present', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockRootEl.addClass).toHaveBeenCalledWith('aman-display-unmapped');
    });

    it('should apply unmapped class when only secondary tickers present', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ type: 'SECONDARY' })],
        isUntracked: false,
      });

      expect(mockRootEl.removeClass).toHaveBeenCalledWith('aman-display-mapped aman-display-unmapped');
      expect(mockRootEl.addClass).toHaveBeenCalledWith('aman-display-unmapped');
    });

    it('should toggle expanded-state class on root', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY' })],
        isUntracked: false,
      });

      // Compact: class removed
      expect(mockRootEl.removeClass).toHaveBeenCalledWith('aman-display-expanded-state');

      // Trigger expand via click handler
      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      // Expanded: class added
      expect(mockRootEl.addClass).toHaveBeenCalledWith('aman-display-expanded-state');
    });
  });

  // ── Expanded output (preserved from existing) ──

  describe('expanded output', () => {
    it('should include compact header and expanded wrapper div', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY' })],
        isUntracked: false,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('🔗 INFY ·');
      expect(lastHtml).toContain('<div class="aman-display-expanded">');
    });

    it('should render primary row with star emoji and data attributes', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY', exchange: 'NSE', name: 'Infosys' })],
        isUntracked: false,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('aman-display-primary');
      expect(lastHtml).toContain('data-alert-ticker-symbol="INFY"');
      expect(lastHtml).toContain('data-alert-ticker-type="PRIMARY"');
      expect(lastHtml).toContain('⭐ INFY · NSE · Infosys');
    });

    it('should render secondary row with diamond emoji', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY2', type: 'SECONDARY', exchange: 'BSE', name: 'Infosys Ltd' })],
        isUntracked: false,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('aman-display-secondary');
      expect(lastHtml).toContain('data-alert-ticker-symbol="INFY2"');
      expect(lastHtml).toContain('data-alert-ticker-type="SECONDARY"');
      expect(lastHtml).toContain('🔹 INFY2 · BSE · Infosys Ltd');
    });

    it('should omit exchange and name when not provided', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', exchange: '', name: '' })],
        isUntracked: false,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('⭐ INFY</div>');
      expect(lastHtml).not.toContain('· NSE');
      expect(lastHtml).not.toContain('· Infosys');
    });
  });

  // ── Empty and untracked expanded states (preserved from existing) ──

  describe('empty and untracked expanded states', () => {
    it('should show empty state message when no tickers and not untracked', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: false,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('aman-display-empty');
      expect(lastHtml).toContain('No linked alert tickers');
    });

    it('should show untracked expanded message when untracked', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:BHEL',
        alertTickers: [],
        isUntracked: true,
      });

      const clickHandler = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === 'click.basebar')?.[1];
      clickHandler!();

      const lastHtml = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0];
      expect(lastHtml).toContain('aman-display-empty');
      expect(lastHtml).toContain('Untracked ticker — no backend record');
    });
  });

  // ── Constructor configuration (preserved from existing) ──

  describe('constructor configuration', () => {
    it('should target #aman-display root element', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [],
        isUntracked: false,
      });

      // The mock jQuery should have been called with #aman-display
      expect(mockJQuery).toHaveBeenCalledWith('#aman-display');
    });

    it('should bind delegated right-click on alert ticker row selector', () => {
      const bar = new AlertBar(mockDomManager, mockAlertTickerManager, mockUIUtil);
      bar.render({
        tvTicker: 'NSE:INFY',
        alertTickers: [createAlertTicker({ symbol: 'INFY', type: 'PRIMARY' })],
        isUntracked: false,
      });

      const onContextmenuCalls = mockRootEl.on.mock.calls.filter(
        (c: any[]) => c[0] === 'contextmenu.basebar'
      );
      expect(onContextmenuCalls.length).toBe(1);
      expect(onContextmenuCalls[0][1]).toBe('.aman-display-alert-ticker-row');
    });
  });
});
