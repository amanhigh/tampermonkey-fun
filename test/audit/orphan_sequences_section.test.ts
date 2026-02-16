import { OrphanSequencesSection } from '../../src/handler/orphan_sequences_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISequenceManager } from '../../src/manager/sequence';
import { Notifier } from '../../src/util/notify';

describe('OrphanSequencesSection', () => {
  let section: OrphanSequencesSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockSequenceRepo: Partial<ISequenceManager>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (ticker: string): AuditResult => ({
    pluginId: 'orphan-sequences',
    code: 'ORPHAN_SEQUENCE',
    target: ticker,
    message: `${ticker}: orphan`,
    severity: 'MEDIUM',
    status: 'FAIL',
    data: { ticker, sequence: 'MWD' },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'orphan-sequences',
      title: 'Orphan Sequences',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = {
      openTicker: jest.fn(),
    };

    mockSequenceRepo = {
      deleteSequence: jest.fn(),
      getCurrentSequence: jest.fn().mockReturnValue('MWD' as any),
      flipSequence: jest.fn(),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new OrphanSequencesSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSequenceRepo as ISequenceManager
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => {
      expect(section.id).toBe('orphan-sequences');
    });

    test('has correct title', () => {
      expect(section.title).toBe('Sequences');
    });

    test('has pagination limit', () => {
      expect(section.limit).toBe(10);
    });

    test('has plugin reference', () => {
      expect(section.plugin).toBe(mockPlugin);
    });

    test('has onFixAll handler', () => {
      expect(section.onFixAll).toBeDefined();
    });
  });

  describe('onLeftClick', () => {
    test('opens ticker in TradingView', () => {
      const result = createResult('ORPHAN');
      section.onLeftClick(result);
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('ORPHAN');
    });
  });

  describe('onRightClick', () => {
    test('deletes only the orphan sequence entry from SequenceRepo', () => {
      const result = createResult('ORPHAN');
      section.onRightClick(result);
      expect(mockSequenceRepo.deleteSequence).toHaveBeenCalledWith('ORPHAN');
    });
  });

  describe('onFixAll', () => {
    test('deletes all orphan sequence entries from SequenceRepo', () => {
      const results = [createResult('ORPHAN1'), createResult('ORPHAN2')];
      section.onFixAll!(results);
      expect(mockSequenceRepo.deleteSequence).toHaveBeenCalledTimes(2);
      expect(mockSequenceRepo.deleteSequence).toHaveBeenCalledWith('ORPHAN1');
      expect(mockSequenceRepo.deleteSequence).toHaveBeenCalledWith('ORPHAN2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      const header = section.headerFormatter([]);
      expect(header).toContain('No sequences');
    });

    test('shows count when results present', () => {
      const results = [createResult('ORPHAN1'), createResult('ORPHAN2')];
      const header = section.headerFormatter(results);
      expect(header).toContain('2');
    });
  });

  describe('buttonColorMapper', () => {
    test('maps MEDIUM severity', () => {
      const result = createResult('ORPHAN');
      const color = section.buttonColorMapper(result);
      expect(color).toBeDefined();
    });
  });
});
