import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { IDomManager } from '../../src/manager/dom';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';
import { SequenceType } from '../../src/models/trading';

// Mock jQuery
const mockJQuery = jest.fn((_selector: string) => ({
  val: jest.fn(),
  css: jest.fn(),
}));
(global as any).$ = mockJQuery;

describe('SequenceHandler', () => {
  let sequenceHandler: SequenceHandler;
  let mockSequenceManager: jest.Mocked<ISequenceManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockDisplayInput: any;

  const makeAlertTicker = (overrides: Partial<AlertTicker> = {}): AlertTicker => ({
    symbol: 'INVESTINGTICKER',
    pair_id: 'pair1',
    name: 'Test Pair',
    exchange: 'NSE',
    ticker: 'TVTICKER',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockResolvedValue(SequenceType.MWD),
      flipSequence: jest.fn().mockResolvedValue(undefined),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockDomManager = {
      getTicker: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getAlertTicker: jest.fn(),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAllAlertTickers: jest.fn(),
    } as any;

    mockDisplayInput = {
      val: jest.fn(),
      css: jest.fn(),
    };

    mockJQuery.mockReturnValue(mockDisplayInput);

    sequenceHandler = new SequenceHandler(
      mockSequenceManager,
      mockDomManager,
      mockAlertTickerManager
    );
  });

  describe('displaySequence', () => {
    it('should display ticker:sequence when ticker is not mapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(null);

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('TVTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'maroon');
    });

    it('should display ticker:sequence:PairName when ticker has alert ticker with name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(
        makeAlertTicker({ symbol: 'INVESTINGTICKER', name: 'NIFTY 50', ticker: 'TVTICKER' })
      );

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:YR:NIFTY 50');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'blue');
    });

    it('should display ticker:sequence when no alert ticker name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(
        makeAlertTicker({ symbol: 'INVESTINGTICKER', name: '', ticker: 'TVTICKER' })
      );

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'black');
    });
  });

  describe('handleSequenceSwitch', () => {
    it('should flip sequence and display', async () => {
      mockSequenceManager.flipSequence.mockResolvedValue(undefined);
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockDomManager.getTicker.mockReturnValue('TVTICKER');
      mockAlertTickerManager.getAlertTicker.mockResolvedValue(null);

      await sequenceHandler.handleSequenceSwitch();

      expect(mockSequenceManager.flipSequence).toHaveBeenCalled();
    });
  });
});
