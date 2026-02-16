import { TradeRiskSection } from '../../src/handler/trade_risk_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IKiteManager } from '../../src/manager/kite';
import { Notifier } from '../../src/util/notify';

describe('TradeRiskSection', () => {
  let section: TradeRiskSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockKiteManager: Partial<IKiteManager>;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyWarnSpy: jest.SpyInstance;

  const createResult = (tvTicker: string, orderId: string): AuditResult => ({
    pluginId: 'trade-risk',
    code: 'INVALID_RISK_MULTIPLE',
    target: tvTicker,
    message: `${tvTicker}: Risk not a multiple`,
    severity: 'HIGH',
    status: 'FAIL',
    data: { tvTicker, orderId, entry: 100, stop: 90, quantity: 50, computedRisk: 500, expectedMultiples: [3200, 6400] },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'trade-risk',
      title: 'Trade Risk Multiple',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockKiteManager = { deleteOrder: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new TradeRiskSection(mockPlugin, mockTickerHandler as ITickerHandler, mockKiteManager as IKiteManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('trade-risk'));
    test('has correct title', () => expect(section.title).toBe('Trade Risk Multiple'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens tvTicker in TradingView', () => {
      section.onLeftClick(createResult('HDFC', 'ord-1'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('HDFC');
    });
  });

  describe('onRightClick', () => {
    test('deletes all orders for the same ticker', () => {
      // Populate allResults via headerFormatter
      const results = [createResult('HDFC', 'ord-1'), createResult('HDFC', 'ord-2'), createResult('TCS', 'ord-3')];
      section.headerFormatter(results);

      section.onRightClick(createResult('HDFC', 'ord-1'));
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('ord-1');
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('ord-2');
      expect(mockKiteManager.deleteOrder).not.toHaveBeenCalledWith('ord-3');
      expect(notifySuccessSpy).toHaveBeenCalledWith('✓ Deleted 2 order(s) for HDFC');
    });

    test('deletes single order when only one for ticker', () => {
      section.headerFormatter([createResult('HDFC', 'ord-1')]);
      section.onRightClick(createResult('HDFC', 'ord-1'));
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('ord-1');
      expect(notifySuccessSpy).toHaveBeenCalledWith('✓ Deleted 1 order(s) for HDFC');
    });

    test('warns when no order ID found in allResults', () => {
      section.headerFormatter([]);
      const result: AuditResult = {
        pluginId: 'trade-risk',
        code: 'INVALID_RISK_MULTIPLE',
        target: 'HDFC',
        message: 'test',
        severity: 'HIGH',
        status: 'FAIL',
        data: { tvTicker: 'HDFC' },
      };
      section.onRightClick(result);
      expect(notifyWarnSpy).toHaveBeenCalled();
      expect(mockKiteManager.deleteOrder).not.toHaveBeenCalled();
    });
  });

  describe('onFixAll', () => {
    test('deletes all non-compliant orders', () => {
      const results = [createResult('HDFC', 'ord-1'), createResult('TCS', 'ord-2')];
      section.onFixAll!(results);
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledTimes(2);
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('ord-1');
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('ord-2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });

    test('skips results without order ID', () => {
      const results: AuditResult[] = [
        createResult('HDFC', 'ord-1'),
        { pluginId: 'trade-risk', code: 'X', target: 'BAD', message: 'x', severity: 'HIGH', status: 'FAIL', data: {} },
      ];
      section.onFixAll!(results);
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No trade risk multiple issues');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('HDFC', 'ord-1')])).toContain('1');
    });
  });
});
