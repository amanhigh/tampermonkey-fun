import { GttAuditSection } from '../../src/handler/gtt_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IKiteManager } from '../../src/manager/kite';
import { Notifier } from '../../src/util/notify';

describe('GttAuditSection', () => {
  let section: GttAuditSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockKiteManager: Partial<IKiteManager>;
  let confirmMock: jest.Mock;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyWarnSpy: jest.SpyInstance;
  let notifyInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPlugin = {
      id: 'gtt-unwatched',
      title: 'GTT Unwatched',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
    };

    mockKiteManager = {
      deleteOrder: jest.fn(),
    };

    confirmMock = jest.fn().mockReturnValue(false);
    (global as any).confirm = confirmMock;

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();
    notifyInfoSpy = jest.spyOn(Notifier, 'info').mockImplementation();
    jest.spyOn(Notifier, 'error').mockImplementation();

    section = new GttAuditSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockKiteManager as IKiteManager
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).confirm;
  });

  describe('Section Properties', () => {
    test('has correct id', () => {
      expect(section.id).toBe('gtt-unwatched');
    });

    test('has correct title', () => {
      expect(section.title).toBe('GTT Orders');
    });

    test('has correct limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin', () => {
      expect(section.plugin).toBe(mockPlugin);
    });
  });

  describe('Left Click Handler', () => {
    test('opens ticker in TradingView', () => {
      const result: AuditResult = {
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED',
        target: 'SBIN',
        message: 'SBIN: 2 orders',
        severity: 'HIGH',
        status: 'FAIL',
        data: { orderIds: ['123', '456'] },
      };

      section.onLeftClick(result);

      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('SBIN');
    });
  });

  describe('Right Click Handler', () => {
    test('deletes GTT orders after confirmation', () => {
      const result: AuditResult = {
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED',
        target: 'SBIN',
        message: 'SBIN: 2 orders',
        severity: 'HIGH',
        status: 'FAIL',
        data: { orderIds: ['123', '456'] },
      };

      confirmMock.mockReturnValue(true);

      section.onRightClick(result);

      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('123');
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('456');
      expect(notifySuccessSpy).toHaveBeenCalledWith('Deleted 2 GTT order(s) for SBIN');
    });

    test('cancels when user declines', () => {
      const result: AuditResult = {
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED',
        target: 'SBIN',
        message: 'SBIN: 2 orders',
        severity: 'HIGH',
        status: 'FAIL',
        data: { orderIds: ['123', '456'] },
      };

      confirmMock.mockReturnValue(false);

      section.onRightClick(result);

      expect(mockKiteManager.deleteOrder).not.toHaveBeenCalled();
      expect(notifyInfoSpy).toHaveBeenCalledWith('Deletion cancelled');
    });

    test('warns when no order IDs', () => {
      const result: AuditResult = {
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED',
        target: 'SBIN',
        message: 'SBIN: 0 orders',
        severity: 'HIGH',
        status: 'FAIL',
        data: {},
      };

      section.onRightClick(result);

      expect(notifyWarnSpy).toHaveBeenCalledWith('No GTT orders found for this ticker');
    });
  });

  describe('Fix All Handler', () => {
    test('deletes all GTT orders for all tickers', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'gtt-unwatched',
          code: 'UNWATCHED',
          target: 'SBIN',
          message: 'SBIN: 2 orders',
          severity: 'HIGH',
          status: 'FAIL',
          data: { orderIds: ['123', '456'] },
        },
        {
          pluginId: 'gtt-unwatched',
          code: 'UNWATCHED',
          target: 'LT',
          message: 'LT: 1 order',
          severity: 'HIGH',
          status: 'FAIL',
          data: { orderIds: ['789'] },
        },
      ];

      section.onFixAll!(results);

      expect(mockKiteManager.deleteOrder).toHaveBeenCalledTimes(3);
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('123');
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('456');
      expect(mockKiteManager.deleteOrder).toHaveBeenCalledWith('789');
      expect(notifySuccessSpy).toHaveBeenCalledWith('Deleted 3 GTT order(s) for 2 ticker(s)');
    });

    test('skips results with no order IDs', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'gtt-unwatched',
          code: 'UNWATCHED',
          target: 'SBIN',
          message: 'SBIN: 0 orders',
          severity: 'HIGH',
          status: 'FAIL',
          data: {},
        },
      ];

      section.onFixAll!(results);

      expect(mockKiteManager.deleteOrder).not.toHaveBeenCalled();
      expect(notifySuccessSpy).toHaveBeenCalledWith('Deleted 0 GTT order(s) for 1 ticker(s)');
    });

    test('handles empty results', () => {
      section.onFixAll!([]);

      expect(mockKiteManager.deleteOrder).not.toHaveBeenCalled();
      expect(notifySuccessSpy).toHaveBeenCalledWith('Deleted 0 GTT order(s) for 0 ticker(s)');
    });
  });

  describe('Header Formatter', () => {
    test('shows success when no results', () => {
      const html = section.headerFormatter([]);
      expect(html).toContain('All orders watched');
      expect(html).toContain('success-badge');
    });

    test('shows count when results exist', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'gtt-unwatched',
          code: 'UNWATCHED',
          target: 'SBIN',
          message: 'SBIN: 2 orders',
          severity: 'HIGH',
          status: 'FAIL',
          data: { orderIds: ['123', '456'] },
        },
      ];

      const html = section.headerFormatter(results);
      expect(html).toContain('Unwatched: 1');
    });
  });
});
