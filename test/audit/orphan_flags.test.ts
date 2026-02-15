import { OrphanFlagsPlugin } from '../../src/manager/orphan_flags_plugin';
import { IFlagRepo } from '../../src/repo/flag';
import { ITickerRepo } from '../../src/repo/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { CategoryLists } from '../../src/models/category';

describe('OrphanFlagsPlugin', () => {
  let plugin: OrphanFlagsPlugin;
  let flagRepo: jest.Mocked<IFlagRepo>;
  let tickerRepo: jest.Mocked<ITickerRepo>;
  let symbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    flagRepo = {
      getFlagCategoryLists: jest.fn(),
    } as any;

    tickerRepo = {
      has: jest.fn(),
    } as any;

    symbolManager = {
      isComposite: jest.fn(),
    } as any;

    plugin = new OrphanFlagsPlugin(flagRepo, tickerRepo, symbolManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('orphan-flags');
      expect(plugin.title).toBe('Flags');
    });
  });

  describe('run', () => {
    it('returns empty array when no flags exist', async () => {
      const categoryLists = new CategoryLists(new Map());
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all flag tickers exist in TickerRepo', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(0, new Set(['HDFC', 'TCS']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      tickerRepo.has.mockReturnValue(true);
      symbolManager.isComposite.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('skips composite/formula tickers', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(0, new Set(['NIFTY/BANKNIFTY', 'GOLD*2']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      symbolManager.isComposite.mockReturnValue(true);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for orphan flag not in TickerRepo', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(2, new Set(['ORPHAN']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      symbolManager.isComposite.mockReturnValue(false);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
      expect(results[0].code).toBe('ORPHAN_FLAG');
      expect(results[0].severity).toBe('LOW');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ tvTicker: 'ORPHAN', categoryIndex: 2 });
    });

    it('emits FAIL for orphan flags across multiple categories', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(0, new Set(['ORPHAN1']));
      lists.set(3, new Set(['ORPHAN2']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      symbolManager.isComposite.mockReturnValue(false);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['ORPHAN1', 'ORPHAN2']);
    });

    it('emits FAIL only for orphan flags when some are valid', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(0, new Set(['VALID', 'ORPHAN']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      symbolManager.isComposite.mockReturnValue(false);
      tickerRepo.has.mockImplementation((key: string) => key === 'VALID');

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['ORPHAN'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      const lists = new Map<number, Set<string>>();
      lists.set(1, new Set(['ORPHAN']));
      const categoryLists = new CategoryLists(lists);
      flagRepo.getFlagCategoryLists.mockReturnValue(categoryLists);
      symbolManager.isComposite.mockReturnValue(false);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result.pluginId).toBe('orphan-flags');
      expect(result.message).toContain('ORPHAN');
      expect(result.message).toContain('category 1');
    });
  });
});
