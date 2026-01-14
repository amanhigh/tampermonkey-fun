import { OrphanAlertsSection } from '../../src/audit/orphan_alerts_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { IAlertRepo } from '../../src/repo/alert';
import { Notifier } from '../../src/util/notify';
import { AUDIT_IDS } from '../../src/models/audit_ids';

// Unit tests for OrphanAlertsSection: UI specification for displaying orphan alerts

describe('OrphanAlertsSection', () => {
  let section: OrphanAlertsSection;
  let mockPlugin: jest.Mocked<IAudit>;
  let mockAlertRepo: jest.Mocked<IAlertRepo>;

  beforeEach(() => {
    // Create mock plugin
    mockPlugin = {
      id: AUDIT_IDS.ORPHAN_ALERTS,
      title: 'Orphan Alerts',
      validate: jest.fn(),
      run: jest.fn(),
    } as jest.Mocked<IAudit>;

    // Create mock alert repo
    mockAlertRepo = {
      delete: jest.fn(),
    } as any;

    // Create section with mocked dependencies
    section = new OrphanAlertsSection(mockPlugin, mockAlertRepo);
  });

  describe('section properties', () => {
    it('should have correct id', () => {
      expect(section.id).toBe(AUDIT_IDS.ORPHAN_ALERTS);
      expect(section.id).toBe('orphan-alerts');
    });

    it('should have correct title', () => {
      expect(section.title).toBe('Orphan Alerts');
    });

    it('should have correct limit', () => {
      expect(section.limit).toBe(10);
    });

    it('should have undefined context', () => {
      expect(section.context).toBeUndefined();
    });

    it('should have injected plugin', () => {
      expect(section.plugin).toBe(mockPlugin);
    });

    it('should have defined handlers', () => {
      expect(section.onLeftClick).toBeDefined();
      expect(section.onRightClick).toBeDefined();
      expect(section.buttonColorMapper).toBeDefined();
      expect(section.headerFormatter).toBeDefined();
    });
  });

  describe('onLeftClick handler', () => {
    it('should show warning notification when left-clicked', () => {
      const notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();
      const pairId = 'TEST-PAIR';

      section.onLeftClick(pairId);

      expect(notifyWarnSpy).toHaveBeenCalledWith(`Cannot open ${pairId} - no pair mapping exists`, 3000);
      notifyWarnSpy.mockRestore();
    });

    it('should handle various pairId formats', () => {
      const notifyWarnSpy = jest.spyOn(Notifier, 'warn').mockImplementation();

      const pairIds = ['SBIN-LONG', 'INFY-SHORT', 'TCS-MID', 'OLD-DELETED'];
      pairIds.forEach((pairId) => {
        section.onLeftClick(pairId);
        expect(notifyWarnSpy).toHaveBeenCalledWith(`Cannot open ${pairId} - no pair mapping exists`, 3000);
      });

      notifyWarnSpy.mockRestore();
    });
  });

  describe('onRightClick handler', () => {
    it('should delete alerts from repository', async () => {
      const notifyRedSpy = jest.spyOn(Notifier, 'red').mockImplementation();
      const pairId = 'TEST-PAIR';

      await section.onRightClick(pairId);

      expect(mockAlertRepo.delete).toHaveBeenCalledWith(pairId);
      notifyRedSpy.mockRestore();
    });

    it('should show notification after deletion', async () => {
      const notifyRedSpy = jest.spyOn(Notifier, 'red').mockImplementation();
      const pairId = 'TEST-PAIR';

      await section.onRightClick(pairId);

      expect(notifyRedSpy).toHaveBeenCalledWith(`❌ Deleted orphan alerts for ${pairId}`);
      notifyRedSpy.mockRestore();
    });

    it('should handle various pairId formats on delete', async () => {
      const notifyRedSpy = jest.spyOn(Notifier, 'red').mockImplementation();

      const pairIds = ['SBIN-LONG', 'INFY-SHORT', 'TCS-MID'];
      for (const pairId of pairIds) {
        await section.onRightClick(pairId);
        expect(mockAlertRepo.delete).toHaveBeenCalledWith(pairId);
      }

      expect(mockAlertRepo.delete).toHaveBeenCalledTimes(3);
      notifyRedSpy.mockRestore();
    });
  });

  describe('buttonColorMapper', () => {
    it('should always return darkred (high severity)', () => {
      const color = section.buttonColorMapper();
      expect(color).toBe('darkred');
    });

    it('should consistently return darkred for all calls', () => {
      expect(section.buttonColorMapper()).toBe('darkred');
      expect(section.buttonColorMapper()).toBe('darkred');
      expect(section.buttonColorMapper()).toBe('darkred');
    });
  });

  describe('headerFormatter', () => {
    it('should show success message when no results', () => {
      const header = section.headerFormatter([]);
      expect(header).toContain('success-badge');
      expect(header).toContain('✓');
      expect(header).toContain('No orphan alerts');
    });

    it('should show count when results exist', () => {
      const results: AuditResult[] = [
        {
          pluginId: AUDIT_IDS.ORPHAN_ALERTS,
          code: 'NO_PAIR_MAPPING',
          target: 'PAIR1',
          message: 'Message 1',
          severity: 'HIGH',
          status: 'FAIL',
        },
      ];

      const header = section.headerFormatter(results);
      expect(header).toContain('Orphans: 1');
      expect(header).toContain('darkred');
    });

    it('should show correct count for multiple results', () => {
      const results: AuditResult[] = Array.from({ length: 5 }, (_, i) => ({
        pluginId: AUDIT_IDS.ORPHAN_ALERTS,
        code: 'NO_PAIR_MAPPING',
        target: `PAIR${i + 1}`,
        message: `Message ${i + 1}`,
        severity: 'HIGH',
        status: 'FAIL',
      }));

      const header = section.headerFormatter(results);
      expect(header).toContain('Orphans: 5');
    });

    it('should format header with color styling', () => {
      const results: AuditResult[] = [
        {
          pluginId: AUDIT_IDS.ORPHAN_ALERTS,
          code: 'NO_PAIR_MAPPING',
          target: 'PAIR1',
          message: 'Message',
          severity: 'HIGH',
          status: 'FAIL',
        },
      ];

      const header = section.headerFormatter(results);
      expect(header).toContain('style');
      expect(header).toContain('darkred');
    });
  });

  describe('integration', () => {
    it('should follow IAuditSection contract', () => {
      // Verify all required properties exist
      expect(section.id).toBeDefined();
      expect(section.title).toBeDefined();
      expect(section.plugin).toBeDefined();
      expect(section.limit).toBeDefined();
      // context is allowed to be undefined
      expect(section.onLeftClick).toBeDefined();
      expect(section.onRightClick).toBeDefined();
      expect(section.buttonColorMapper).toBeDefined();
      expect(section.headerFormatter).toBeDefined();
    });

    it('should have consistent orphan alerts theme', () => {
      // All indicators should use darkred (danger/high-priority color)
      const mockResult: AuditResult = {
        pluginId: AUDIT_IDS.ORPHAN_ALERTS,
        code: 'NO_PAIR_MAPPING',
        target: 'TEST',
        message: 'Test',
        severity: 'HIGH',
        status: 'FAIL',
      };

      expect(section.buttonColorMapper()).toBe('darkred');

      const header = section.headerFormatter([mockResult]);
      expect(header).toContain('darkred');
    });
  });
});
