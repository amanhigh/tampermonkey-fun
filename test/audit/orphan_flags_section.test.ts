import { OrphanFlagsSection } from '../../src/handler/orphan_flags_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('OrphanFlagsSection', () => {
  let section: OrphanFlagsSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (ticker: string, categoryIndex = 0): AuditResult => ({
    pluginId: 'orphan-flags',
    code: 'ORPHAN_FLAG',
    target: ticker,
    message: `${ticker}: orphan flag`,
    severity: 'LOW',
    status: 'FAIL',
    data: { ticker, categoryIndex },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'orphan-flags',
      title: 'Orphan Flags',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockPairHandler = { stopTrackingByTvTicker: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new OrphanFlagsSection(mockPlugin, mockTickerHandler as ITickerHandler, mockPairHandler as IPairHandler);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('orphan-flags'));
    test('has correct title', () => expect(section.title).toBe('Orphan Flags'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens ticker in TradingView', () => {
      section.onLeftClick(createResult('ORPHAN'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('ORPHAN');
    });
  });

  describe('onRightClick', () => {
    test('stops tracking orphan ticker', () => {
      section.onRightClick(createResult('ORPHAN'));
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('ORPHAN');
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all orphan flag tickers', () => {
      const results = [createResult('O1'), createResult('O2')];
      section.onFixAll!(results);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledTimes(2);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('O1');
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('O2');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No orphan flags');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('O1'), createResult('O2')])).toContain('2');
    });
  });
});
