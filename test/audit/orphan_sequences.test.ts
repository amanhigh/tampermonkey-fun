import { OrphanSequencesPlugin } from '../../src/manager/orphan_sequences_plugin';
import { ISequenceRepo } from '../../src/repo/sequence';
import { ITickerRepo } from '../../src/repo/ticker';
import { SequenceType } from '../../src/models/trading';

describe('OrphanSequencesPlugin', () => {
  let plugin: OrphanSequencesPlugin;
  let sequenceRepo: jest.Mocked<ISequenceRepo>;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    sequenceRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    tickerRepo = {
      has: jest.fn(),
    } as any;

    plugin = new OrphanSequencesPlugin(sequenceRepo, tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('orphan-sequences');
      expect(plugin.title).toBe('Sequences');
    });
  });

  describe('run', () => {
    it('returns empty array when no sequences exist', async () => {
      sequenceRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all sequences have corresponding tickers', async () => {
      sequenceRepo.getAllKeys.mockReturnValue(['HDFC', 'TCS']);
      tickerRepo.has.mockReturnValue(true);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for orphan sequence not in TickerRepo', async () => {
      sequenceRepo.getAllKeys.mockReturnValue(['ORPHAN']);
      sequenceRepo.get.mockReturnValue(SequenceType.MWD);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
      expect(results[0].code).toBe('ORPHAN_SEQUENCE');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ ticker: 'ORPHAN', sequence: SequenceType.MWD });
    });

    it('emits FAIL only for orphan sequences when some are valid', async () => {
      sequenceRepo.getAllKeys.mockReturnValue(['VALID', 'ORPHAN']);
      sequenceRepo.get.mockImplementation((key: string) => {
        if (key === 'ORPHAN') return SequenceType.YR;
        return SequenceType.MWD;
      });
      tickerRepo.has.mockImplementation((key: string) => key === 'VALID');

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
    });

    it('handles multiple orphan sequences', async () => {
      sequenceRepo.getAllKeys.mockReturnValue(['ORPHAN1', 'ORPHAN2']);
      sequenceRepo.get.mockReturnValue(SequenceType.MWD);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['ORPHAN1', 'ORPHAN2']);
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['ORPHAN'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      sequenceRepo.getAllKeys.mockReturnValue(['ORPHAN']);
      sequenceRepo.get.mockReturnValue(SequenceType.MWD);
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
      expect(result.pluginId).toBe('orphan-sequences');
      expect(result.message).toContain('ORPHAN');
    });
  });
});
