import { AuditSectionRegistry } from '../../src/util/audit_registry';
import { IAuditSection } from '../../src/handler/audit_section';
import { IAudit } from '../../src/models/audit';
import { Constants } from '../../src/models/constant';

describe('AuditSectionRegistry', () => {
  let registry: AuditSectionRegistry;

  beforeEach(() => {
    registry = new AuditSectionRegistry();
  });

  describe('registerSection', () => {
    it('should register a section', () => {
      const mockPlugin: IAudit = {
        id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection: IAuditSection = {
        id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
        title: 'Test Section',
        order: 6,
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection);

      expect(registry.mustGetSection(Constants.AUDIT.PLUGINS.GTT_UNWATCHED)).toEqual(mockSection);
    });

    it('should throw error for duplicate section id', () => {
      const mockSection: IAuditSection = {
        id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
        title: 'Test Section',
        order: 6,
        plugin: {
          id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
          title: 'Test Plugin',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };
      
      registry.registerSection(mockSection);

      expect(() => registry.registerSection(mockSection)).toThrow(
        `Audit section '${Constants.AUDIT.PLUGINS.GTT_UNWATCHED}' is already registered`
      );
    });
  });

  describe('mustGetSection', () => {
    it('should return registered section', () => {
      const mockPlugin: IAudit = {
        id: Constants.AUDIT.PLUGINS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection: IAuditSection = {
        id: Constants.AUDIT.PLUGINS.ALERTS,
        title: 'Test Section',
        order: 0,
        plugin: mockPlugin,
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection);

      expect(registry.mustGetSection(Constants.AUDIT.PLUGINS.ALERTS)).toEqual(mockSection);
    });

    it('should throw error for unregistered section', () => {
      expect(() => registry.mustGetSection(Constants.AUDIT.PLUGINS.ALERTS)).toThrow(
        `Audit section '${Constants.AUDIT.PLUGINS.ALERTS}' not found in registry`
      );
    });
  });

  describe('listSections', () => {
    it('should return empty list when no sections registered', () => {
      expect(registry.listSections()).toEqual([]);
    });

    it('should return all registered sections', () => {
      const mockPlugin1: IAudit = {
        id: Constants.AUDIT.PLUGINS.ALERTS,
        title: 'Plugin 1',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockPlugin2: IAudit = {
        id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
        title: 'Plugin 2',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockSection1: IAuditSection = {
        id: Constants.AUDIT.PLUGINS.ALERTS,
        title: 'Section 1',
        order: 0,
        plugin: mockPlugin1,
        headerFormatter: jest.fn().mockReturnValue('Header 1'),
        buttonColorMapper: jest.fn().mockReturnValue('blue'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      const mockSection2: IAuditSection = {
        id: Constants.AUDIT.PLUGINS.GTT_UNWATCHED,
        title: 'Section 2',
        order: 6,
        plugin: mockPlugin2,
        headerFormatter: jest.fn().mockReturnValue('Header 2'),
        buttonColorMapper: jest.fn().mockReturnValue('red'),
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection1);
      registry.registerSection(mockSection2);

      const sections = registry.listSections();
      expect(sections).toHaveLength(2);
      expect(sections).toContainEqual(mockSection1);
      expect(sections).toContainEqual(mockSection2);
    });
  });
});
