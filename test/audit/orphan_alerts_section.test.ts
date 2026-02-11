import { OrphanAlertsSection } from '../../src/handler/orphan_alerts_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { IAlertRepo } from '../../src/repo/alert';
import { IAlertManager } from '../../src/manager/alert';
import { Alert } from '../../src/models/alert';
import { Notifier } from '../../src/util/notify';

describe('OrphanAlertsSection', () => {
  let section: OrphanAlertsSection;
  let mockPlugin: IAudit;
  let mockAlertRepo: Partial<IAlertRepo>;
  let mockAlertManager: Partial<IAlertManager>;
  let confirmMock: jest.Mock;
  let notifyWarnSpy: jest.SpyInstance;
  let notifyInfoSpy: jest.SpyInstance;
  let notifySuccessSpy: jest.SpyInstance;
  let notifyErrorSpy: jest.SpyInstance;

  const createMockAlert = (pairId: string, price: number): Alert => {
    return new Alert(`${pairId}-${price}`, pairId, price);
  };

  beforeEach(() => {
    // Mock plugin
    mockPlugin = {
      id: 'orphan-alerts',
      title: 'Orphan Alerts',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    // Mock alert repo
    mockAlertRepo = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getAllKeys: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      has: jest.fn(),
      addAlert: jest.fn(),
      getSortedAlerts: jest.fn(),
      removeAlert: jest.fn(),
      hasAlerts: jest.fn(),
      getAlertCount: jest.fn(),
      createAlertClickEvent: jest.fn(),
    };

    // Mock alert manager
    mockAlertManager = {
      deleteAlert: jest.fn().mockResolvedValue(undefined),
    };

    // Mock global confirm
    confirmMock = jest.fn().mockReturnValue(false);
    (global as any).confirm = confirmMock;

    // Mock Notifier methods
    notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();
    notifyInfoSpy = jest.spyOn(Notifier, 'info').mockImplementation();
    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    notifyErrorSpy = jest.spyOn(Notifier, 'error').mockImplementation();

    section = new OrphanAlertsSection(mockPlugin, mockAlertRepo as IAlertRepo, mockAlertManager as IAlertManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).confirm;
  });

  describe('Section Properties', () => {
    test('has correct id', () => {
      expect(section.id).toBe('orphan-alerts');
    });

    test('has correct title', () => {
      expect(section.title).toBe('Alerts');
    });

    test('has correct limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin', () => {
      expect(section.plugin).toBe(mockPlugin);
    });

    test('onLeftClick shows warning', () => {
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 6 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertName: 'JBM Auto', alertCount: 6 },
      };

      section.onLeftClick(result);

      expect(notifyWarnSpy).toHaveBeenCalledWith('JBM Auto — no ticker mapping, cannot navigate', 3000);
    });

    test('onRightClick is async function', () => {
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      expect(section.onRightClick(result)).toBeInstanceOf(Promise);
    });
  });

  describe('Right-Click Handler: Deletion', () => {
    test('extracts pairId and alertCount from data field', async () => {
      const alerts = [createMockAlert('6393', 391.92), createMockAlert('6393', 404.4)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 2 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 2 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);

      await section.onRightClick(result);

      expect(mockAlertRepo.get).toHaveBeenCalledWith('6393');
    });

    test('cancels deletion when user declines confirmation', async () => {
      const alerts = [createMockAlert('6393', 391.92)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(false);

      await section.onRightClick(result);

      expect(notifyInfoSpy).toHaveBeenCalledWith('Deletion cancelled');
      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });

    test('deletes all alerts when user confirms', async () => {
      const alerts = [createMockAlert('6393', 391.92), createMockAlert('6393', 404.4), createMockAlert('6393', 410.0)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 3 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 3 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);

      await section.onRightClick(result);

      expect(mockAlertManager.deleteAlert).toHaveBeenCalledTimes(3);
      expect(mockAlertManager.deleteAlert).toHaveBeenCalledWith(alerts[0]);
      expect(mockAlertManager.deleteAlert).toHaveBeenCalledWith(alerts[1]);
      expect(mockAlertManager.deleteAlert).toHaveBeenCalledWith(alerts[2]);
    });

    test('removes pairId from repo after deletion', async () => {
      const alerts = [createMockAlert('6393', 391.92)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);

      await section.onRightClick(result);

      expect(mockAlertRepo.delete).toHaveBeenCalledWith('6393');
    });

    test('shows success notification after deletion', async () => {
      const alerts = [createMockAlert('6393', 391.92)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);

      await section.onRightClick(result);

      expect(notifySuccessSpy).toHaveBeenCalledWith('✓ Deleted 1 orphan alert(s) for 6393');
    });

    test('shows warning when no alerts found', async () => {
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 0 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 0 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue([]);

      await section.onRightClick(result);

      expect(notifyWarnSpy).toHaveBeenCalledWith('No alerts found for pairId 6393');
      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });

    test('handles alert manager errors gracefully', async () => {
      const alerts = [createMockAlert('6393', 391.92)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);
      (mockAlertManager.deleteAlert as jest.Mock).mockRejectedValue(new Error('API Error: Cannot delete alert'));

      await section.onRightClick(result);

      expect(notifyErrorSpy).toHaveBeenCalledWith('Failed to delete alerts: API Error: Cannot delete alert');
      expect(mockAlertRepo.delete).not.toHaveBeenCalled();
    });

    test('shows confirmation with alert details and prices', async () => {
      const alerts = [createMockAlert('6393', 391.92), createMockAlert('6393', 404.4)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 2 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 2 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(false);

      await section.onRightClick(result);

      expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('Delete 2 orphan alert(s)?'));
      expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('PairId: 6393'));
      expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('391.92, 404.4'));
    });

    test('handles missing pairId in data field', async () => {
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { alertCount: 1 }, // missing pairId
      };

      await section.onRightClick(result);

      expect(notifyWarnSpy).toHaveBeenCalledWith('Invalid orphan alert result: missing pairId');
      expect(mockAlertRepo.get).not.toHaveBeenCalled();
    });

    test('shows progress notification during deletion', async () => {
      const alerts = [createMockAlert('6393', 391.92)];
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      (mockAlertRepo.get as jest.Mock).mockReturnValue(alerts);
      confirmMock.mockReturnValue(true);

      await section.onRightClick(result);

      expect(notifyInfoSpy).toHaveBeenCalledWith('Deleting 1 alert(s)...');
    });
  });

  describe('Fix All Handler', () => {
    test('deletes all orphan alerts for all pairs', async () => {
      const alerts1 = [createMockAlert('6393', 391.92), createMockAlert('6393', 404.4)];
      const alerts2 = [createMockAlert('6394', 100.0)];
      const results: AuditResult[] = [
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6393',
          message: '6393: 2 alert(s)',
          severity: 'HIGH',
          status: 'FAIL',
          data: { pairId: '6393', alertCount: 2 },
        },
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6394',
          message: '6394: 1 alert(s)',
          severity: 'HIGH',
          status: 'FAIL',
          data: { pairId: '6394', alertCount: 1 },
        },
      ];

      (mockAlertRepo.get as jest.Mock).mockImplementation((pairId: string) => {
        if (pairId === '6393') return alerts1;
        if (pairId === '6394') return alerts2;
        return [];
      });

      await section.onFixAll!(results);

      expect(mockAlertManager.deleteAlert).toHaveBeenCalledTimes(3);
      expect(mockAlertRepo.delete).toHaveBeenCalledWith('6393');
      expect(mockAlertRepo.delete).toHaveBeenCalledWith('6394');
      expect(notifySuccessSpy).toHaveBeenCalledWith('✓ Deleted 3 orphan alert(s) for 2 pair(s)');
    });

    test('skips results with missing pairId', async () => {
      const results: AuditResult[] = [
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6393',
          message: '6393: 1 alert(s)',
          severity: 'HIGH',
          status: 'FAIL',
          data: { alertCount: 1 }, // missing pairId
        },
      ];

      await section.onFixAll!(results);

      expect(mockAlertRepo.get).not.toHaveBeenCalled();
      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });

    test('skips pairs with no alerts found', async () => {
      const results: AuditResult[] = [
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6393',
          message: '6393: 0 alert(s)',
          severity: 'HIGH',
          status: 'FAIL',
          data: { pairId: '6393', alertCount: 0 },
        },
      ];

      (mockAlertRepo.get as jest.Mock).mockReturnValue([]);

      await section.onFixAll!(results);

      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
      expect(mockAlertRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('Button Color Mapper', () => {
    test('always returns darkred', () => {
      const result: AuditResult = {
        pluginId: 'orphan-alerts',
        code: 'NO_PAIR_MAPPING',
        target: '6393',
        message: '6393: 1 alert(s) exist but have no corresponding pair',
        severity: 'HIGH',
        status: 'FAIL',
        data: { pairId: '6393', alertCount: 1 },
      };

      const color = section.buttonColorMapper(result);
      expect(color).toBe('darkred');
    });
  });

  describe('Header Formatter', () => {
    test('shows success message when no results', () => {
      const html = section.headerFormatter([]);
      expect(html).toContain('No orphan alerts');
      expect(html).toContain('success-badge');
    });

    test('shows count when results exist', () => {
      const results: AuditResult[] = [
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6393',
          message: '6393: 1 alert(s) exist but have no corresponding pair',
          severity: 'HIGH',
          status: 'FAIL',
          data: { pairId: '6393', alertCount: 1 },
        },
        {
          pluginId: 'orphan-alerts',
          code: 'NO_PAIR_MAPPING',
          target: '6394',
          message: '6394: 2 alert(s) exist but have no corresponding pair',
          severity: 'HIGH',
          status: 'FAIL',
          data: { pairId: '6394', alertCount: 1 },
        },
      ];

      const html = section.headerFormatter(results);
      expect(html).toContain('Orphan Alerts: 2');
      expect(html).toContain('darkred');
    });
  });
});
