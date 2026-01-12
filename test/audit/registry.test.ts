import { AuditRegistry } from '../../src/audit/registry';
import { IAuditSection } from '../../src/audit/section';
import { IAudit } from '../../src/models/audit';
import { AUDIT_IDS } from '../../src/models/audit_ids';

describe('AuditRegistry', () => {
  let registry: AuditRegistry;

  beforeEach(() => {
    registry = new AuditRegistry();
  });

  describe('registerSection', () => {
    it('should register a section', () => {
      const mockSection: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Test Section',
        plugin: {
          id: AUDIT_IDS.GTT_UNWATCHED,
          title: 'Test Plugin',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColor: 'blue',
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection);

      expect(registry.mustGetSection(AUDIT_IDS.GTT_UNWATCHED)).toEqual(mockSection);
    });

    it('should throw error for duplicate section id', () => {
      const mockSection: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Test Section',
        plugin: {
          id: AUDIT_IDS.GTT_UNWATCHED,
          title: 'Test Plugin',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColor: 'blue',
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection);

      expect(() => {
        registry.registerSection(mockSection);
      }).toThrow(`Duplicate section id: ${AUDIT_IDS.GTT_UNWATCHED}`);
    });
  });

  describe('mustGetSection', () => {
    it('should return registered section', () => {
      const mockSection: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Test Section',
        plugin: {
          id: AUDIT_IDS.GTT_UNWATCHED,
          title: 'Test Plugin',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header'),
        buttonColor: 'blue',
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection);

      expect(registry.mustGetSection(AUDIT_IDS.GTT_UNWATCHED)).toEqual(mockSection);
    });

    it('should throw error for non-existent section', () => {
      expect(() => {
        registry.mustGetSection(AUDIT_IDS.ALERTS);
      }).toThrow(`Section '${AUDIT_IDS.ALERTS}' not found in registry`);
    });
  });

  describe('listSections', () => {
    it('should return empty array when no sections registered', () => {
      expect(registry.listSections()).toEqual([]);
    });

    it('should return all registered sections', () => {
      const mockSection1: IAuditSection = {
        id: AUDIT_IDS.GTT_UNWATCHED,
        title: 'Section 1',
        plugin: {
          id: AUDIT_IDS.GTT_UNWATCHED,
          title: 'Plugin 1',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header 1'),
        buttonColor: 'blue',
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      const mockSection2: IAuditSection = {
        id: AUDIT_IDS.ORPHAN_ALERTS,
        title: 'Section 2',
        plugin: {
          id: AUDIT_IDS.ORPHAN_ALERTS,
          title: 'Plugin 2',
          validate: jest.fn(),
          run: jest.fn().mockResolvedValue([]),
        },
        headerFormatter: jest.fn().mockReturnValue('Header 2'),
        buttonColor: 'red',
        onLeftClick: jest.fn(),
        onRightClick: jest.fn(),
      };

      registry.registerSection(mockSection1);
      registry.registerSection(mockSection2);

      const sections = registry.listSections();

      expect(sections).toHaveLength(2);
      expect(sections).toContain(mockSection1);
      expect(sections).toContain(mockSection2);
    });
  });

  describe('registerPlugin', () => {
    it('should register a plugin', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      registry.registerPlugin(mockPlugin);

      expect(registry.mustGet(AUDIT_IDS.ALERTS)).toEqual(mockPlugin);
    });

    it('should throw error for duplicate plugin id', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      registry.registerPlugin(mockPlugin);

      expect(() => {
        registry.registerPlugin(mockPlugin);
      }).toThrow(`Duplicate audit id: ${AUDIT_IDS.ALERTS}`);
    });

    it('should throw error for invalid plugin', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn().mockImplementation(() => {
          throw new Error('Invalid plugin');
        }),
        run: jest.fn().mockResolvedValue([]),
      };

      expect(() => {
        registry.registerPlugin(mockPlugin);
      }).toThrow(`Invalid audit plugin '${AUDIT_IDS.ALERTS}': Invalid plugin`);
    });
  });

  describe('mustGet', () => {
    it('should return registered plugin', () => {
      const mockPlugin: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Test Plugin',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      registry.registerPlugin(mockPlugin);

      expect(registry.mustGet(AUDIT_IDS.ALERTS)).toEqual(mockPlugin);
    });

    it('should throw error for non-existent plugin', () => {
      expect(() => {
        registry.mustGet(AUDIT_IDS.UNMAPPED_PAIRS);
      }).toThrow(`Audit plugin '${AUDIT_IDS.UNMAPPED_PAIRS}' not found in registry`);
    });
  });

  describe('list', () => {
    it('should return empty array when no plugins registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('should return all registered plugins', () => {
      const mockPlugin1: IAudit = {
        id: AUDIT_IDS.ALERTS,
        title: 'Plugin 1',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      const mockPlugin2: IAudit = {
        id: AUDIT_IDS.ORPHAN_ALERTS,
        title: 'Plugin 2',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      };

      registry.registerPlugin(mockPlugin1);
      registry.registerPlugin(mockPlugin2);

      const plugins = registry.list();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(mockPlugin1);
      expect(plugins).toContain(mockPlugin2);
    });
  });
});
