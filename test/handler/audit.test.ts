import { AuditHandler } from '../../src/handler/audit';
import { IAuditManager } from '../../src/manager/audit';
import { IUIUtil } from '../../src/util/ui';
import { ITickerHandler } from '../../src/handler/ticker';
import { IWatchManager } from '../../src/manager/watch';
import { ISymbolManager } from '../../src/manager/symbol';
import { IPairHandler } from '../../src/handler/pair';
import { IKiteHandler } from '../../src/handler/kite';
import { AlertState, AlertAudit } from '../../src/models/alert';
import { Constants } from '../../src/models/constant';

// Mock jQuery globally for DOM operations
const mockJQuery = {
  empty: jest.fn().mockReturnThis(),
  length: 1,
  remove: jest.fn().mockReturnThis(),
  replaceWith: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  css: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  click: jest.fn().mockReturnThis(),
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
  },
}));

describe('AuditHandler', () => {
  let auditHandler: AuditHandler;
  let mockAuditManager: jest.Mocked<IAuditManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockPairHandler: jest.Mocked<IPairHandler>;
  let mockKiteHandler: jest.Mocked<IKiteHandler>;

  beforeEach(() => {
    // Reset jQuery mock
    jest.clearAllMocks();
    mockJQuery.empty.mockReturnThis();
    mockJQuery.remove.mockReturnThis();
    mockJQuery.replaceWith.mockReturnThis();
    mockJQuery.appendTo.mockReturnThis();
    mockJQuery.css.mockReturnThis();
    mockJQuery.on.mockReturnThis();

    mockAuditManager = {
      auditAlerts: jest.fn(),
      filterAuditResults: jest.fn(),
      auditCurrentTicker: jest.fn(),
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

    mockKiteHandler = {
      performGttAudit: jest.fn().mockResolvedValue(undefined),
    } as any;

    auditHandler = new AuditHandler(
      mockAuditManager,
      mockUIUtil,
      mockTickerHandler,
      mockWatchManager,
      mockSymbolManager,
      mockPairHandler,
      mockKiteHandler
    );
  });

  describe('CSS Selector ID Generation', () => {
    // Test the private getAuditButtonId method by testing its behavior through public methods
    it('should generate CSS-safe IDs for basic ticker symbols', async () => {
      const mockAlertAudit = new AlertAudit('RELIANCE', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Verify $ was called with escaped ID
      expect($).toHaveBeenCalledWith('#audit-RELIANCE');
    });

    it('should escape equals signs in US treasury symbols', async () => {
      const mockAlertAudit = new AlertAudit('US10YT=X', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Verify $ was called with escaped ID (= becomes -)
      expect($).toHaveBeenCalledWith('#audit-US10YT-X');
    });

    it('should escape ampersands in corporate symbols', async () => {
      const mockAlertAudits = [
        new AlertAudit('M&M', AlertState.NO_ALERTS),
        new AlertAudit('AT&T', AlertState.SINGLE_ALERT),
      ];

      for (const result of mockAlertAudits) {
        jest.clearAllMocks();
        mockAuditManager.auditCurrentTicker.mockResolvedValue(result);
        mockWatchManager.isWatched.mockReturnValue(false);

        await auditHandler.auditCurrent();

        const expectedId = `#audit-${result.investingTicker}`.replace(/[^a-zA-Z0-9-_#]/g, '-');
        expect($).toHaveBeenCalledWith(expectedId);
      }
    });

    it('should escape colons in exchange-prefixed symbols', async () => {
      const mockAlertAudits = [
        new AlertAudit('NSE:RELIANCE', AlertState.NO_ALERTS),
        new AlertAudit('BINANCE:BTCUSDT', AlertState.SINGLE_ALERT),
      ];

      for (const result of mockAlertAudits) {
        jest.clearAllMocks();
        mockAuditManager.auditCurrentTicker.mockResolvedValue(result);
        mockWatchManager.isWatched.mockReturnValue(false);

        await auditHandler.auditCurrent();

        const expectedId = `#audit-${result.investingTicker}`.replace(/[^a-zA-Z0-9-_#]/g, '-');
        expect($).toHaveBeenCalledWith(expectedId);
      }
    });

    it('should escape complex composite symbols', async () => {
      const mockAlertAudit = new AlertAudit('GOLD/MCX:GOLD1!', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // All special characters should become hyphens
      expect($).toHaveBeenCalledWith('#audit-GOLD-MCX-GOLD1-');
    });

    it('should handle multiple special characters', async () => {
      const mockAlertAudit = new AlertAudit('TEST@#$%^&*()', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // All special characters should become hyphens
      expect($).toHaveBeenCalledWith('#audit-TEST---------');
    });

    it('should preserve hyphens and underscores', async () => {
      const mockAlertAudit = new AlertAudit('VALID-ID_123', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Hyphens and underscores should be preserved
      expect($).toHaveBeenCalledWith('#audit-VALID-ID_123');
    });

    it('should handle empty ticker', async () => {
      const mockAlertAudit = new AlertAudit('', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      expect($).toHaveBeenCalledWith('#audit-');
    });

    it('should handle whitespace in ticker', async () => {
      const mockAlertAudit = new AlertAudit('   ', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditCurrent();

      // Spaces should become hyphens
      expect($).toHaveBeenCalledWith('#audit----');
    });
  });

  describe('auditAll', () => {
    beforeEach(() => {
      mockAuditManager.filterAuditResults.mockReturnValue([]);
      mockAuditManager.auditAlerts.mockResolvedValue(undefined);
    });

    it('should clear existing audit area', async () => {
      await auditHandler.auditAll();

      expect($).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.AUDIT}`);
      expect(mockJQuery.empty).toHaveBeenCalled();
    });

    it('should create audit label', async () => {
      await auditHandler.auditAll();

      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('Tot: 0', 'lightgray');
    });

    it('should filter non-watched audit results', async () => {
      const singleAlerts = [
        new AlertAudit('TICKER1', AlertState.SINGLE_ALERT),
        new AlertAudit('TICKER2', AlertState.SINGLE_ALERT),
      ];
      const noAlerts = [new AlertAudit('TICKER3', AlertState.NO_ALERTS)];

      mockAuditManager.filterAuditResults.mockReturnValueOnce(singleAlerts).mockReturnValueOnce(noAlerts);

      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditAll();

      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith('Tot: 3', 'lightgray');
    });

    it('should limit audit buttons to 10', async () => {
      // Create 15 audit results to test the limit
      const auditResults = Array.from({ length: 15 }, (_, i) => new AlertAudit(`TICKER${i}`, AlertState.NO_ALERTS));

      mockAuditManager.filterAuditResults.mockReturnValueOnce(auditResults).mockReturnValueOnce([]);

      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(false);

      await auditHandler.auditAll();

      // Should only create 10 buttons (plus 1 label)
      expect(mockUIUtil.buildButton).toHaveBeenCalledTimes(10);
    });

    it('should perform GTT audit', async () => {
      await auditHandler.auditAll();

      expect(mockKiteHandler.performGttAudit).toHaveBeenCalled();
    });
  });

  describe('auditCurrent', () => {
    it('should remove button for valid alerts', async () => {
      const mockAlertAudit = new AlertAudit('TICKER1', AlertState.VALID);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);

      await auditHandler.auditCurrent();

      expect(mockJQuery.remove).toHaveBeenCalled();
      expect(mockUIUtil.buildButton).not.toHaveBeenCalled();
    });

    it('should remove button for watched tickers', async () => {
      const mockAlertAudit = new AlertAudit('TICKER1', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockSymbolManager.investingToTv.mockReturnValue('TV_TICKER');
      mockWatchManager.isWatched.mockReturnValue(true);

      await auditHandler.auditCurrent();

      expect(mockJQuery.remove).toHaveBeenCalled();
      expect(mockUIUtil.buildButton).not.toHaveBeenCalled();
    });

    it('should replace existing button with updated state', async () => {
      const mockAlertAudit = new AlertAudit('TICKER1', AlertState.SINGLE_ALERT);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockJQuery.length = 1; // Simulate button exists

      await auditHandler.auditCurrent();

      expect(mockUIUtil.buildButton).toHaveBeenCalledWith('audit-TICKER1', 'TICKER1', expect.any(Function));
      expect(mockJQuery.replaceWith).toHaveBeenCalled();
    });

    it('should append new button if none exists', async () => {
      const mockAlertAudit = new AlertAudit('TICKER1', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
      mockWatchManager.isWatched.mockReturnValue(false);
      mockJQuery.length = 0; // Simulate button doesn't exist

      await auditHandler.auditCurrent();

      expect(mockUIUtil.buildButton).toHaveBeenCalledWith('audit-TICKER1', 'TICKER1', expect.any(Function));
      expect(mockJQuery.appendTo).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });
  });

  describe('Button Context Menu', () => {
    it('should handle right-click to delete pair mapping', async () => {
      const mockAlertAudit = new AlertAudit('TEST_TICKER', AlertState.NO_ALERTS);
      mockAuditManager.auditCurrentTicker.mockResolvedValue(mockAlertAudit);
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
});
