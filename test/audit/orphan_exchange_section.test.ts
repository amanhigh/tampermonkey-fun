import { OrphanExchangeSection } from '../../src/handler/orphan_exchange_section';
import { IAudit, AuditResult } from '../../src/models/audit';
import { ITickerHandler } from '../../src/handler/ticker';
import { IPairHandler } from '../../src/handler/pair';
import { Notifier } from '../../src/util/notify';

describe('OrphanExchangeSection', () => {
  let section: OrphanExchangeSection;
  let mockPlugin: IAudit;
  let mockTickerHandler: Partial<ITickerHandler>;
  let mockPairHandler: Partial<IPairHandler>;
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
    mockPairHandler = { stopTrackingByTvTicker: jest.fn() };

    notifySuccessSpy = jest.spyOn(Notifier, 'success').mockImplementation();
    jest.spyOn(Notifier, 'warn').mockImplementation();

    section = new OrphanExchangeSection(
      mockPlugin,
      mockTickerHandler as ITickerHandler,
      mockPairHandler as IPairHandler
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
    test('stops tracking orphan exchange ticker', () => {
      section.onRightClick(createResult('HDFC'));
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('HDFC');
    });
  });

  describe('onFixAll', () => {
    test('stops tracking all orphan exchange tickers', () => {
      const results = [createResult('HDFC'), createResult('TCS')];
      section.onFixAll!(results);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledTimes(2);
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('HDFC');
      expect(mockPairHandler.stopTrackingByTvTicker).toHaveBeenCalledWith('TCS');
      expect(notifySuccessSpy).toHaveBeenCalled();
    });
  });

  describe('headerFormatter', () => {
    test('shows success when no results', () => {
      expect(section.headerFormatter([])).toContain('No exchanges');
    });

    test('shows count when results present', () => {
      expect(section.headerFormatter([createResult('HDFC')])).toContain('1');
    });
  });
});
