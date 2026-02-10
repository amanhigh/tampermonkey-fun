import { OrphanSequencesSection } from '../../src/handler/orphan_sequences_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('OrphanSequencesSection', () => {
  let section: OrphanSequencesSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
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

    mockPairHandler = {
      stopTrackingByTvTicker: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new OrphanSequencesSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler
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
      expect(section.title).toBe('Orphan Sequences');
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
    test('stops tracking orphan sequence ticker', () => {
      const result = createResult('ORPHAN');
      section.onRightClick(result);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('ORPHAN');
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all orphan sequence tickers', () => {
      const results = [createResult('ORPHAN1'), createResult('ORPHAN2')];
      section.onFixAll!(results);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledTimes(2);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('ORPHAN1');
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('ORPHAN2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      const header = section.headerFormatter([]);
      expect(header).toContain('No orphan sequences');
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
