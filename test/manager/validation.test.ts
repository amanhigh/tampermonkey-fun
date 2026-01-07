import { ValidationManager } from '../../src/manager/validation';
import { Alert, PairInfo } from '../../src/models/alert';
import { IAlertRepo } from '../../src/repo/alert';
import { IPairRepo } from '../../src/repo/pair';
import { AuditRegistry } from '../../src/audit/registry';

describe('ValidationManager', () => {
  let validationManager: ValidationManager;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;
  let mockPairRepo: jest.Mocked<IPairRepo>;
  let mockAuditRegistry: jest.Mocked<AuditRegistry>;

  beforeEach(() => {
    // Initialize proper mocks with all required methods
    mockAlertRepo = {
      addAlert: jest.fn(),
      getSortedAlerts: jest.fn(),
      removeAlert: jest.fn(),
      hasAlerts: jest.fn(),
      createAlertClickEvent: jest.fn(),
      getCount: jest.fn(),
      getAllKeys: jest.fn().mockReturnValue([]),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IAlertRepo>;

    mockPairRepo = {
      getPairInfo: jest.fn(),
      getAllInvestingTickers: jest.fn(),
      pinPair: jest.fn(),
      getAllKeys: jest.fn().mockReturnValue([]),
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getCount: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IPairRepo>;

    mockAuditRegistry = {
      register: jest.fn(),
      get: jest.fn().mockReturnValue(undefined),
      list: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<AuditRegistry>;

    validationManager = new ValidationManager(mockAlertRepo, mockPairRepo, mockAuditRegistry);
  });

  describe('Alert to Pair Validation (via Plugin)', () => {
    test('should handle when OrphanAlertsAudit plugin is not available', async () => {
      // Setup - plugin returns undefined (not available)
      mockAlertRepo.getAllKeys.mockReturnValue([]);
      mockPairRepo.getAllKeys.mockReturnValue([]);
      mockAuditRegistry.get.mockReturnValue(undefined);

      // Execute
      const results = await validationManager.validate();

      // Verify - should still complete without error
      expect(results.getOrphanAlertCount()).toBe(0);
    });

    test('should process orphan alerts from plugin results', async () => {
      // Setup - mock plugin with orphan alerts result
      const orphanAlert = new Alert('1', 'orphanPair', 100);
      const validPair = new PairInfo('HDFC', 'validPair', 'NSE', 'HDV');

      mockAlertRepo.getAllKeys.mockReturnValue(['orphanPair']);
      mockAlertRepo.get.mockImplementation((key: string) => (key === 'orphanPair' ? [orphanAlert] : undefined));
      mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
      mockPairRepo.get.mockReturnValue(validPair);

      const mockPlugin = {
        id: 'orphan-alerts',
        title: 'Orphan Alerts',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([
          {
            pluginId: 'orphan-alerts',
            code: 'NO_PAIR_MAPPING',
            target: 'orphanPair',
            message: 'orphanPair: Alert exists but has no corresponding pair',
            severity: 'HIGH' as const,
            status: 'FAIL' as const,
          },
        ]),
      };
      mockAuditRegistry.get.mockImplementation((id: string) =>
        id === 'orphan-alerts' ? (mockPlugin as any) : undefined
      );

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(1);
      expect(mockAuditRegistry.get).toHaveBeenCalledWith('orphan-alerts');
    });

    test('should identify orphan alerts via plugin', async () => {
      // Setup
      const orphanAlert = new Alert('1', 'orphanPair', 100);
      mockAlertRepo.get.mockReturnValue([orphanAlert]);

      const mockPlugin = {
        id: 'orphan-alerts',
        title: 'Orphan Alerts',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([
          {
            pluginId: 'orphan-alerts',
            code: 'NO_PAIR_MAPPING',
            target: 'orphanPair',
            message: 'orphanPair: Alert exists but has no corresponding pair',
            severity: 'HIGH' as const,
            status: 'FAIL' as const,
          },
        ]),
      };
      mockAuditRegistry.get.mockImplementation((id: string) =>
        id === 'orphan-alerts' ? (mockPlugin as any) : undefined
      );

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(1);
    });

    test('should not flag alerts with valid pairs', async () => {
      // Setup
      const validAlert = new Alert('1', 'validPair', 100);
      mockAlertRepo.getAllKeys.mockReturnValue(['validPair']);
      mockAlertRepo.get.mockImplementation((key: string) => (key === 'validPair' ? [validAlert] : undefined));
      mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
      mockPairRepo.get.mockImplementation((key: string) =>
        key === 'HDV' ? new PairInfo('HDFC', 'validPair', 'NSE', 'HDV') : undefined
      );
      mockAuditRegistry.get.mockReturnValue(undefined);

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(0);
    });
  });

  describe('Pair to Ticker Validation (via Plugin)', () => {
    test('should handle when UnmappedPairsAudit plugin is not available', async () => {
      // Setup - plugin returns undefined (not available)
      mockAlertRepo.getAllKeys.mockReturnValue([]);
      mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
      mockAuditRegistry.get.mockReturnValue(undefined);

      // Execute
      const results = await validationManager.validate();

      // Verify - should still complete without error
      expect(results.getUnmappedPairCount()).toBe(0);
    });

    test('should process unmapped pairs from plugin results', async () => {
      // Setup - mock plugin with unmapped pairs result
      const unmappedPair = new PairInfo('HDFC', 'pair1', 'NSE', 'HDV');
      mockAlertRepo.getAllKeys.mockReturnValue([]);
      mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
      mockPairRepo.get.mockImplementation((key: string) => (key === 'HDV' ? unmappedPair : undefined));

      const mockPlugin = {
        id: 'unmapped-pairs',
        title: 'Unmapped Pairs',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([
          {
            pluginId: 'unmapped-pairs',
            code: 'NO_TV_MAPPING',
            target: 'HDV',
            message: 'HDV: Pair exists but has no TradingView mapping',
            severity: 'HIGH' as const,
            status: 'FAIL' as const,
          },
        ]),
      };
      mockAuditRegistry.get.mockImplementation((id: string) =>
        id === 'unmapped-pairs' ? (mockPlugin as any) : undefined
      );

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getUnmappedPairCount()).toBe(1);
      expect(mockAuditRegistry.get).toHaveBeenCalledWith('unmapped-pairs');
    });
  });

  describe('Mixed Validation Scenarios', () => {
    test('should handle null/undefined values from repositories', async () => {
      // Setup
      mockAlertRepo.get.mockReturnValue([]);
      mockPairRepo.get.mockReturnValue(undefined);
      mockPairRepo.getPairInfo.mockReturnValue(null);
      mockAuditRegistry.get.mockReturnValue(undefined);

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(0);
      expect(results.getUnmappedPairCount()).toBe(0);
    });

    test('should handle empty repositories', async () => {
      // Setup with empty data
      mockAlertRepo.getAllKeys.mockReturnValue([]);
      mockPairRepo.getAllKeys.mockReturnValue([]);
      mockAuditRegistry.get.mockReturnValue(undefined);

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(0);
      expect(results.getUnmappedPairCount()).toBe(0);
    });

    test('should identify multiple issues simultaneously', async () => {
      // Setup
      const orphanAlert = new Alert('1', 'orphanPair', 100);
      const unmappedPair = new PairInfo('HDFC', 'pair1', 'NSE', 'HDV');

      mockAlertRepo.getAllKeys.mockReturnValue(['orphanPair']);
      mockPairRepo.getAllKeys.mockReturnValue(['HDV']);

      mockAlertRepo.get.mockImplementation((key: string) => (key === 'orphanPair' ? [orphanAlert] : undefined));
      mockPairRepo.get.mockImplementation((key: string) => (key === 'HDV' ? unmappedPair : undefined));

      const orphanAlertsPlugin = {
        id: 'orphan-alerts',
        title: 'Orphan Alerts',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([
          {
            pluginId: 'orphan-alerts',
            code: 'NO_PAIR_MAPPING',
            target: 'orphanPair',
            message: 'orphanPair: Alert exists but has no corresponding pair',
            severity: 'HIGH' as const,
            status: 'FAIL' as const,
          },
        ]),
      };

      const unmappedPairsPlugin = {
        id: 'unmapped-pairs',
        title: 'Unmapped Pairs',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([
          {
            pluginId: 'unmapped-pairs',
            code: 'NO_TV_MAPPING',
            target: 'HDV',
            message: 'HDV: Pair exists but has no TradingView mapping',
            severity: 'HIGH' as const,
            status: 'FAIL' as const,
          },
        ]),
      };

      mockAuditRegistry.get.mockImplementation((id: string) => {
        if (id === 'orphan-alerts') return orphanAlertsPlugin as any;
        if (id === 'unmapped-pairs') return unmappedPairsPlugin as any;
        return undefined;
      });

      // Execute
      const results = await validationManager.validate();

      // Verify
      expect(results.getOrphanAlertCount()).toBe(1);
      expect(results.getUnmappedPairCount()).toBe(1);
      expect(results.getOrphanAlerts()).toContain(orphanAlert);
      expect(results.getUnmappedPairs()).toContain(unmappedPair);
    });
  });
});
