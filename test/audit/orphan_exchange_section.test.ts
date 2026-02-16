import { OrphanExchangeSection } from '../../src/handler/orphan_exchange_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { Notifier } from '../../src/util/notify';

describe('OrphanExchangeSection', () => {
  let section: OrphanExchangeSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockSymbolManager: Partial<ISymbolManager>;
  let notifySuccessSpy: jest.SpyInstance;

  const createResult = (tvTicker: string): AuditResult => ({
    pluginId: 'orphan-exchange',
    code: 'ORPHAN_EXCHANGE',
    target: tvTicker,
    message: `${tvTicker}: orphan exchange`,
    severity: 'MEDIUM',
    status: 'FAIL',
    data: { tvTicker, exchangeValue: `NSE:${tvTicker}` },
  });

  beforeEach(() => {
    mockPlugin = {
      id: 'orphan-exchange',
      title: 'Orphan Exchange',
      validate: jest.fn(),
      run: jest.fn().mockResolvedValue([]),
    };

    mockTickerHandler = { openTicker: jest.fn() };
    mockSymbolManager = {
      removeTvToExchangeTickerMapping: jest.fn(),
      tvToExchangeTicker: jest.fn(),
    };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new OrphanExchangeSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockSymbolManager as ISymbolManager
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Section Properties', () => {
    test('has correct id', () => expect(section.id).toBe('orphan-exchange'));
    test('has correct title', () => expect(section.title).toBe('Exchange'));
    test('has pagination limit', () => expect(section.limit).toBe(10));
    test('has plugin reference', () => expect(section.plugin).toBe(mockPlugin));
    test('has onFixAll handler', () => expect(section.onFixAll).toBeDefined());
  });

  describe('onLeftClick', () => {
    test('opens tvTicker in TradingView', () => {
      section.onLeftClick(createResult('HDFC'));
      expect(mockTickerHandler.openTicker).toHaveBeenCalledWith('HDFC');
    });
  });

  describe('onRightClick', () => {
    test('deletes only the orphan exchange entry from ExchangeRepo', () => {
      section.onRightClick(createResult('HDFC'));
      expect(mockSymbolManager.removeTvToExchangeTickerMapping).toHaveBeenCalledWith('HDFC');
    });
  });

  describe('onFixAll', () => {
    test('deletes all orphan exchange entries from ExchangeRepo', () => {
      const results = [createResult('HDFC'), createResult('TCS')];
      section.onFixAll!(results);
      expect(mockSymbolManager.removeTvToExchangeTickerMapping).toHaveBeenCalledTimes(2);
      expect(mockSymbolManager.removeTvToExchangeTickerMapping).toHaveBeenCalledWith('HDFC');
      expect(mockSymbolManager.removeTvToExchangeTickerMapping).toHaveBeenCalledWith('TCS');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No exchange');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('HDFC')])).toContain('1');
    });
  });
});
