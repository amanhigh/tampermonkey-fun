import { AuditRegistry } from '../../src/audit/registry';
import { IAuditSection } from '../../src/audit/section';
import { IAudit } from '../../src/models/audit';
import { AUDIT_IDS } from '../../src/models/audit_ids';

describe('AuditRegistry', () => {
  let registry: AuditRegistry;

  beforeEach(() => {
    registry = new AuditRegistry();
  });

  describe('registerSectionFactory', () => {
    it('should register a section factory and instantiate on first access', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Test Section',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      const factory = jest.fn().mockReturnValue(mockSection);
      registry.registerSectionFactory(AUDIT_IDS.GTT_UNWATCHED, factory);

      expect(factory).not.toHaveBeenCalled();
      expect(registry.mustGetSection(AUDIT_IDS.GTT_UNWATCHED)).toEqual(mockSection);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should throw error for duplicate section id', () => {
      const factory = jest.fn();
      registry.registerSectionFactory(AUDIT_IDS.GTT_UNWATCHED, factory);

      expect(() => registry.registerSectionFactory(AUDIT_IDS.GTT_UNWATCHED, factory)).toThrow(
        `Duplicate section id: ${AUDIT_IDS.GTT_UNWATCHED}`
      );
    });
  });

  describe('mustGetSection', () => {
    it('should return registered section', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection: IAuditSection = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Section',
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSectionFactory(AUDIT_IDS.ALERTS, () => mockSection);

      expect(registry.mustGetSection(AUDIT_IDS.ALERTS)).toEqual(mockSection);
    });

    it('should throw error for unregistered section', () => {
      expect(() => registry.mustGetSection(AUDIT_IDS.ALERTS)).toThrow(
        "Section 'alerts' not found in registry"
      );
    });
  });

  describe('listSections', () => {
    it('should return empty list when no sections registered', () => {
      expect(registry.listSections()).toEqual([]);
    });

    it('should return all registered sections', () => {
      const mockPlugin1: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Plugin 1',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockPlugin2: IAudit = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Plugin 2',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection1: IAuditSection = {
        id: AUDIT_IDS.ALERTS,
        title: 'Section 1',
        plugin: mockPlugin1,
        headerFormatter: jest.fn().mockReturnValue('Header 1'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      const mockSection2: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Section 2',
        plugin: mockPlugin2,
        headerFormatter: jest.fn().mockReturnValue('Header 2'),
        buttonColorMapper: jest.fn().mockReturnValue('red'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSectionFactory(AUDIT_IDS.ALERTS, () => mockSection1);
      registry.registerSectionFactory(AUDIT_IDS.GTT_UNWATCHED, () => mockSection2);

      const sections = registry.listSections();
      expect(sections).toHaveLength(2);
      expect(sections).toContainEqual(mockSection1);
      expect(sections).toContainEqual(mockSection2);
    });
  });
});
