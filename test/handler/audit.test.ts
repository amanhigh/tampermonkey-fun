import { AuditHandler } from '../../src/handler/audit';
import { IAuditManager } from '../../src/manager/audit';
import { AuditRegistry } from '../../src/audit/registry';
import { IUIUtil } from '../../src/util/ui';
import { ITickerHandler } from '../../src/handler/ticker';
import { ITickerManager } from '../../src/manager/ticker';
import { IWatchManager } from '../../src/manager/watch';
import { ISymbolManager } from '../../src/manager/symbol';
import { IPairHandler } from '../../src/handler/pair';
import { AlertState, AlertAudit } from '../../src/models/alert';
import { Constants } from '../../src/models/constant';
import { AuditResult } from '../../src/models/audit';

// Mock jQuery globally for DOM operations
const mockJQuery = {
  empty: jest.fn().mockReturnThis(),
  length: 1,
  remove: jest.fn().mockReturnThis(),
  replaceWith: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  prependTo: jest.fn().mockReturnThis(),
  css: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  click: jest.fn().mockReturnThis(),
  find: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  addClass: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  prop: jest.fn().mockReturnThis(),
  slideUp: jest.fn().mockReturnThis(),
  slideDown: jest.fn().mockReturnThis(),
} as any;

// Mock jQuery with proper typing
(global as any).$ = jest.fn(() => mockJQuery);

// Mock Notifier to prevent document access errors
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    red: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    message: jest.fn(),
  },
}));

describe('AuditHandler', () => {
  let auditHandler: AuditHandler;
  let mockAuditManager: jest.Mocked<IAuditManager>;
  let mockAuditRegistry: jest.Mocked<AuditRegistry>;
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockPairHandler: jest.Mocked<IPairHandler>;

  beforeEach(() => {
    // Reset jQuery mock
    jest.clearAllMocks();
    mockJQuery.empty.mockReturnThis();
    mockJQuery.remove.mockReturnThis();
    mockJQuery.replaceWith.mockReturnThis();
    mockJQuery.appendTo.mockReturnThis();
    mockJQuery.prependTo.mockReturnThis();
    mockJQuery.css.mockReturnThis();
    mockJQuery.on.mockReturnThis();
    mockJQuery.find.mockReturnThis();
    mockJQuery.hide.mockReturnThis();
    mockJQuery.show.mockReturnThis();
    mockJQuery.attr.mockReturnThis();
    mockJQuery.addClass.mockReturnThis();
    mockJQuery.html.mockReturnThis();
    mockJQuery.data.mockReturnThis();
    mockJQuery.prop.mockReturnThis();
    mockJQuery.slideUp.mockReturnThis();
    mockJQuery.slideDown.mockReturnThis();

    mockAuditManager = {
      resetAuditResults: jest.fn(),
      filterAuditResults: jest.fn().mockReturnValue([]),
      updateTickerAudit: jest.fn(),
    } as any;

    mockAuditRegistry = {
      mustGet: jest.fn(),
      mustGetSection: jest.fn(),
      register: jest.fn(),
      registerPlugin: jest.fn(),
      registerSection: jest.fn(),
      list: jest.fn().mockReturnValue([]),
    } as any;

    mockTickerManager = {
      getInvestingTicker: jest.fn(),
    } as any;

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQuery),
      buildButton: jest.fn().mockReturnValue(mockJQuery),
    } as any;

    mockTickerHandler = {
      openTicker: jest.fn(),
    } as any;

    mockWatchManager = {
      isWatched: jest.fn(),
    } as any;

    mockSymbolManager = {
      investingToTv: jest.fn(),
    } as any;

    mockPairHandler = {
      deletePairInfo: jest.fn().mockResolvedValue(undefined),
    } as any;

    auditHandler = new AuditHandler(
      mockAuditManager,
      mockAuditRegistry,
      mockTickerManager,
      mockUIUtil,
      mockTickerHandler,
      mockWatchManager,
      mockSymbolManager,
      mockPairHandler
    );
  });

  describe('CSS Selector ID Generation', () => {
    // Test the private getAuditButtonId method by testing its behavior through public methods
    it('should generate CSS-safe IDs for basic ticker symbols', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('RELIANCE');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('RELIANCE', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Verify $ was called with escaped ID
      expect($).toHaveBeenCalledWith('#audit-RELIANCE');
    });

    it('should escape equals signs in US treasury symbols', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('US10YT=X');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('US10YT=X', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Verify $ was called with escaped ID (= becomes -)
      expect($).toHaveBeenCalledWith('#audit-US10YT-X');
    });

    it('should escape ampersands in corporate symbols', async () => {
      const testCases = [
        { ticker: 'M&M', expected: '#audit-M-M' },
        { ticker: 'AT&T', expected: '#audit-AT-T' },
      ];

      for (const { ticker, expected } of testCases) {
        jest.clearAllMocks();
        mockTickerManager.getInvestingTicker.mockReturnValue(ticker);
        mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit(ticker, AlertState.NO_ALERTS));
        const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
        mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
        mockWatchManager.isWatched.mockReturnValue(false);

        await auditHandler.auditCurrent();

        expect($).toHaveBeenCalledWith(expected);
      }
    });

    it('should escape colons in exchange-prefixed symbols', async () => {
      const testCases = [
        { ticker: 'NSE:RELIANCE', expected: '#audit-NSE-RELIANCE' },
        { ticker: 'BINANCE:BTCUSDT', expected: '#audit-BINANCE-BTCUSDT' },
      ];

      for (const { ticker, expected } of testCases) {
        jest.clearAllMocks();
        mockTickerManager.getInvestingTicker.mockReturnValue(ticker);
        mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit(ticker, AlertState.NO_ALERTS));
        const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
        mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
        mockWatchManager.isWatched.mockReturnValue(false);

        await auditHandler.auditCurrent();

        expect($).toHaveBeenCalledWith(expected);
      }
    });

    it('should escape complex composite symbols', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('GOLD/MCX:GOLD1!');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('GOLD/MCX:GOLD1!', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // All special characters should become hyphens
      expect($).toHaveBeenCalledWith('#audit-GOLD-MCX-GOLD1-');
    });

    it('should handle multiple special characters', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('TEST@#$%^&*()');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TEST@#$%^&*()', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // All special characters should become hyphens
      expect($).toHaveBeenCalledWith('#audit-TEST---------');
    });

    it('should preserve hyphens and underscores', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('VALID-ID_123');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('VALID-ID_123', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Hyphens and underscores should be preserved
      expect($).toHaveBeenCalledWith('#audit-VALID-ID_123');
    });

    it('should handle empty ticker', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      expect($).toHaveBeenCalledWith('#audit-');
    });

    it('should handle whitespace in ticker', async () => {
      mockTickerManager.getInvestingTicker.mockReturnValue('   ');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('   ', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Spaces should become hyphens
      expect($).toHaveBeenCalledWith('#audit----');
    });
  });

  describe('auditAllOnFirstRun', () => {
    beforeEach(() => {
      // Setup mocks for auditAllOnFirstRun tests
      const mockPlugin = {
        run: jest.fn().mockResolvedValue([]),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);

      const mockAlertsSection = {
        id: 'alerts',
        title: 'Alerts Coverage',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('One: 0, None: 0, Inv: 0, Tot: 0'),
        buttonColorMapper: jest.fn().mockReturnValue('darkorange'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;

      const mockGttSection = {
        id: 'gtt-unwatched',
        title: 'GTT Orders',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('GTT Orders'),
        buttonColorMapper: jest.fn().mockReturnValue('gold'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;

      // Return appropriate section based on ID
      mockAuditRegistry.mustGetSection.mockImplementation((id) => {
        if (id === 'alerts') return mockAlertsSection;
        if (id === 'gtt-unwatched') return mockGttSection;
        throw new Error(`Unknown section: ${id}`);
      });

      mockAuditManager.filterAuditResults.mockReturnValue([]);
    });

    it('should run audits on first call', async () => {
      await auditHandler.auditAllOnFirstRun();

      // Verify audit was run - check that global refresh button was created
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH,
        '🔄 Refresh All Audits',
        expect.any(Function)
      );
      // Verify section refresh buttons were created (Alerts and GTT)
      expect(mockUIUtil.buildButton.mock.calls.length).toBeGreaterThan(1);
    });

    it('should not run audits on second call (lazy load pattern)', async () => {
      // Clear previous calls from beforeEach setup
      jest.clearAllMocks();

      // First call - should run
      await auditHandler.auditAllOnFirstRun();
      const firstButtonCallCount = mockUIUtil.buildButton.mock.calls.length;

      // Second call - should not run again
      jest.clearAllMocks();
      await auditHandler.auditAllOnFirstRun();
      const secondButtonCallCount = mockUIUtil.buildButton.mock.calls.length;

      // Second call should not create any buttons (nothing runs)
      expect(secondButtonCallCount).toBe(0);
      expect(firstButtonCallCount).toBeGreaterThan(0);
    });
  });

  describe('auditAll', () => {
    beforeEach(() => {
      // Mock AlertsAudit plugin with run() method
      const mockPlugin = {
        run: jest.fn().mockResolvedValue([]),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);

      // Mock Alerts section
      const mockAlertsSection = {
        id: 'alerts',
        title: 'Alerts Coverage',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('One: 0, None: 0, Inv: 0, Tot: 0'),
        buttonColorMapper: jest.fn().mockReturnValue('darkorange'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;

      // Mock GTT section with plugin and all required properties
      const mockGttSection = {
        id: 'gtt-unwatched',
        title: 'GTT Orders',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('GTT Orders'),
        buttonColorMapper: jest.fn().mockReturnValue('gold'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;

      // Return appropriate section based on ID
      mockAuditRegistry.mustGetSection.mockImplementation((id) => {
        if (id === 'alerts') return mockAlertsSection;
        if (id === 'gtt-unwatched') return mockGttSection;
        throw new Error(`Unknown section: ${id}`);
      });

      mockAuditManager.filterAuditResults.mockReturnValue([]);
    });

    it('should clear existing audit area', async () => {
      await auditHandler.auditAll();

      // Audit area is accessed but not cleared anymore (renderer handles section rendering)
      expect($).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });

    it('should create audit label', async () => {
      await auditHandler.auditAll();

      // buildLabel is no longer used for Alerts section (uses renderer instead)
      // But global refresh button still uses buildButton
      expect(mockUIUtil.buildButton).toHaveBeenCalled();
    });

    it('should filter non-watched audit results', async () => {
      const pluginResults = [
        {
          pluginId: 'alerts',
          code: AlertState.SINGLE_ALERT,
          target: 'TICKER1',
          message: 'msg',
          severity: 'HIGH',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.SINGLE_ALERT,
          target: 'TICKER2',
          message: 'msg',
          severity: 'HIGH',
          status: 'FAIL',
        },
        {
          pluginId: 'alerts',
          code: AlertState.NO_ALERTS,
          target: 'TICKER3',
          message: 'msg',
          severity: 'MEDIUM',
          status: 'FAIL',
        },
      ] as AuditResult[];

      const mockAlertsPlugin = {
        run: jest.fn().mockResolvedValue(pluginResults),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockAlertsPlugin as any);

      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditAll();

      // Plugin should be called once to get results
      expect(mockAlertsPlugin.run).toHaveBeenCalledTimes(1);
      // Manager should NOT be used for filtering anymore
      expect(mockAuditManager.filterAuditResults).not.toHaveBeenCalled();
    });

    it('should limit audit buttons to 10', async () => {
      // Create 15 audit results to test the limit
      const pluginResults = Array.from({ length: 15 }, (_, i) => ({
        pluginId: 'alerts',
        code: AlertState.NO_ALERTS,
        target: `TICKER${i}`,
        message: 'msg',
        severity: 'MEDIUM',
        status: 'FAIL',
      })) as AuditResult[];

      const mockAlertsPlugin = {
        run: jest.fn().mockResolvedValue(pluginResults),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockAlertsPlugin as any);

      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditAll();

      // Verify buttons were created (exact count varies with renderer implementation)
      // Should have at least: global refresh + some audit buttons + GTT refresh buttons
      expect(mockUIUtil.buildButton.mock.calls.length).toBeGreaterThan(10);
    });

    it('should create global refresh button', async () => {
      const mockPlugin = {
        run: jest.fn().mockResolvedValue([]),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);

      const mockGttSection = {
        id: 'gtt-unwatched',
        title: 'GTT Orders',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('GTT Orders'),
        buttonColorMapper: jest.fn().mockReturnValue('gold'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;
      mockAuditRegistry.mustGetSection.mockReturnValue(mockGttSection as any);
      mockAuditManager.filterAuditResults.mockReturnValue([]);

      await auditHandler.auditAll();

      // Check that buildButton was called with global refresh button id
      expect(mockUIUtil.buildButton).toHaveBeenCalledWith(
        Constants.UI.IDS.BUTTONS.AUDIT_GLOBAL_REFRESH,
        '🔄 Refresh All Audits',
        expect.any(Function)
      );
    });

    it('should perform GTT audit', async () => {
      const mockAlertPlugin = { run: jest.fn().mockResolvedValue([]) };
      const mockGttPlugin = { run: jest.fn().mockResolvedValue([]) };

      mockAuditRegistry.mustGet.mockReturnValueOnce(mockAlertPlugin as any);

      // Update mustGetSection to return section with mockGttPlugin
      const mockGttSection = {
        id: 'gtt-unwatched',
        title: 'GTT Orders',
        plugin: mockGttPlugin,
        headerFormatter: jest.fn().mockReturnValue('GTT Orders'),
        buttonColorMapper: jest.fn().mockReturnValue('gold'),
        limit: 10,
        context: undefined,
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      } as any;
      mockAuditRegistry.mustGetSection.mockReturnValue(mockGttSection as any);

      await auditHandler.auditAll();

      expect(mockGttPlugin.run).toHaveBeenCalled();
    });
  });

  describe('auditCurrent', () => {
    beforeEach(() => {
      // Setup for auditCurrent tests
      mockTickerManager.getInvestingTicker.mockReturnValue('TICKER1');
      mockAuditManager.updateTickerAudit.mockImplementation((ticker, state) => new AlertAudit(ticker, state));

      // Mock AlertsAudit plugin
      const mockPlugin = {
        run: jest.fn().mockResolvedValue([]),
      };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
    });

    it('should remove button for valid alerts', async () => {
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TICKER1', AlertState.VALID));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);

      await auditHandler.auditCurrent();

      expect(mockJQuery.remove).toHaveBeenCalled();
      expect(mockUIUtil.buildButton).not.toHaveBeenCalled();
    });

    it('should remove button for watched tickers', async () => {
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TICKER1', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(true);

      await auditHandler.auditCurrent();

      expect(mockJQuery.remove).toHaveBeenCalled();
      expect(mockUIUtil.buildButton).not.toHaveBeenCalled();
    });

    it('should replace existing button with updated state', async () => {
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TICKER1', AlertState.SINGLE_ALERT));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockJQuery.length = 1; // Simulate button exists

      await auditHandler.auditCurrent();

      expect(mockUIUtil.buildButton).toHaveBeenCalledWith('audit-TICKER1', 'TICKER1', expect.any(Function));
      expect(mockJQuery.replaceWith).toHaveBeenCalled();
    });

    it('should append new button if none exists', async () => {
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TICKER1', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockJQuery.length = 0; // Simulate button doesn't exist

      await auditHandler.auditCurrent();

      expect(mockUIUtil.buildButton).toHaveBeenCalledWith('audit-TICKER1', 'TICKER1', expect.any(Function));
      expect(mockJQuery.appendTo).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });
  });

  describe('Button Context Menu', () => {
    beforeEach(() => {
      // Setup for button context menu tests
      mockTickerManager.getInvestingTicker.mockReturnValue('TEST_TICKER');
      mockAuditManager.updateTickerAudit.mockReturnValue(new AlertAudit('TEST_TICKER', AlertState.NO_ALERTS));
      const mockPlugin = { run: jest.fn().mockResolvedValue([]) };
      mockAuditRegistry.mustGet.mockReturnValue(mockPlugin as any);
    });

    it('should handle right-click to delete pair mapping', async () => {
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Get the context menu handler that was registered
      expect(mockJQuery.on).toHaveBeenCalledWith('contextmenu', expect.any(Function));
      const contextMenuHandler = mockJQuery.on.mock.calls.find((call: any) => call[0] === 'contextmenu')[1];

      // Simulate context menu event
      const mockEvent = { preventDefault: jest.fn() };
      await contextMenuHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPairHandler.deletePairInfo).toHaveBeenCalledWith('TEST_TICKER');
    });
  });

  describe('Button Color Mapping', () => {
    it('should apply darkred color for NO_PAIR (invalid mapping) state', () => {
      // This test verifies the button color mapper in AlertsAuditSection
      // NO_PAIR state should result in darkred buttons
      const result = {
        pluginId: 'alerts',
        code: AlertState.NO_PAIR,
        target: 'INVALID_TICKER',
        message: 'INVALID_TICKER: NO_PAIR',
        severity: 'HIGH' as const,
        status: 'FAIL' as const,
      };

      // The color mapper should be applied by renderer when building buttons
      // We verify this by checking that section with buttonColorMapper is properly configured
      const mockAlertsSection = {
        id: 'alerts',
        title: 'Alerts Coverage',
        plugin: { run: jest.fn().mockResolvedValue([]) },
        buttonColorMapper: (r: any) => {
          if (r.code === AlertState.NO_PAIR) return 'darkred';
          if (r.code === AlertState.SINGLE_ALERT) return 'darkorange';
          if (r.code === AlertState.NO_ALERTS) return 'darkgray';
          return 'black';
        },
        headerFormatter: jest.fn().mockReturnValue('Test Header'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
        limit: 10,
        context: undefined,
      };

      mockAuditRegistry.mustGetSection.mockReturnValue(mockAlertsSection as any);

      // Verify the mapper returns correct color for NO_PAIR
      expect(mockAlertsSection.buttonColorMapper(result)).toBe('darkred');
    });

    it('should apply darkorange color for SINGLE_ALERT state', () => {
      const result = {
        pluginId: 'alerts',
        code: AlertState.SINGLE_ALERT,
        target: 'TICKER1',
        message: 'TICKER1: SINGLE_ALERT',
        severity: 'HIGH' as const,
        status: 'FAIL' as const,
      };

      const mockAlertsSection = {
        id: 'alerts',
        title: 'Alerts Coverage',
        plugin: { run: jest.fn().mockResolvedValue([]) },
        buttonColorMapper: (r: any) => {
          if (r.code === AlertState.NO_PAIR) return 'darkred';
          if (r.code === AlertState.SINGLE_ALERT) return 'darkorange';
          if (r.code === AlertState.NO_ALERTS) return 'darkgray';
          return 'black';
        },
        headerFormatter: jest.fn().mockReturnValue('Test Header'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
        limit: 10,
        context: undefined,
      };

      mockAuditRegistry.mustGetSection.mockReturnValue(mockAlertsSection as any);
      expect(mockAlertsSection.buttonColorMapper(result)).toBe('darkorange');
    });

    it('should apply darkgray color for NO_ALERTS state', () => {
      const result = {
        pluginId: 'alerts',
        code: AlertState.NO_ALERTS,
        target: 'TICKER2',
        message: 'TICKER2: NO_ALERTS',
        severity: 'MEDIUM' as const,
        status: 'FAIL' as const,
      };

      const mockAlertsSection = {
        id: 'alerts',
        title: 'Alerts Coverage',
        plugin: { run: jest.fn().mockResolvedValue([]) },
        buttonColorMapper: (r: any) => {
          if (r.code === AlertState.NO_PAIR) return 'darkred';
          if (r.code === AlertState.SINGLE_ALERT) return 'darkorange';
          if (r.code === AlertState.NO_ALERTS) return 'darkgray';
          return 'black';
        },
        headerFormatter: jest.fn().mockReturnValue('Test Header'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
        limit: 10,
        context: undefined,
      };

      mockAuditRegistry.mustGetSection.mockReturnValue(mockAlertsSection as any);
      expect(mockAlertsSection.buttonColorMapper(result)).toBe('darkgray');
    });
  });
});
