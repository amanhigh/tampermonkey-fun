import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { ITickerManager } from '../../src/manager/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
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
  let mockTickerManager: jest.Mocked<ITickerManager>;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;
  let mockDisplayInput: any;

  beforeEach(() => {
    mockSequenceManager = {
      getCurrentSequence: jest.fn().mockResolvedValue(SequenceType.MWD),
      flipSequence: jest.fn().mockResolvedValue(undefined),
      sequenceToTimeFrameConfig: jest.fn(),
      toggleFreezeSequence: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockTickerManager = {
      getTicker: jest.fn(),
    } as any;

    mockSymbolManager = {
      tvToInvesting: jest.fn(),
    } as any;

    mockAlertTickerManager = {
      getAlertTickers: jest.fn().mockResolvedValue([]),
      createAlertTicker: jest.fn(),
    } as any;

    mockDisplayInput = {
      val: jest.fn(),
      css: jest.fn(),
    };

    mockJQuery.mockReturnValue(mockDisplayInput);

    sequenceHandler = new SequenceHandler(
      mockSequenceManager,
      mockTickerManager,
      mockSymbolManager,
      mockAlertTickerManager
    );
  });

  describe('displaySequence', () => {
    it('should display ticker:sequence when ticker is not mapped', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue(null);

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('TVTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'maroon');
    });

    it('should display ticker:sequence:PairName when ticker has alert ticker with name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.YR);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue('INVESTINGTICKER');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([
        { name: 'NIFTY 50', symbol: 'NIFTY', pair_id: '123', exchange: 'NSE' } as AlertTicker,
      ]);

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:YR:NIFTY 50');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'blue');
    });

    it('should display ticker:sequence when no alert ticker name', async () => {
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue('INVESTINGTICKER');
      mockAlertTickerManager.getAlertTickers.mockResolvedValue([]);

      await sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'black');
    });
  });

  describe('handleSequenceSwitch', () => {
    it('should flip sequence and display', async () => {
      mockSequenceManager.flipSequence.mockResolvedValue(undefined);
      mockSequenceManager.getCurrentSequence.mockResolvedValue(SequenceType.MWD);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue(null);

      await sequenceHandler.handleSequenceSwitch();

      expect(mockSequenceManager.flipSequence).toHaveBeenCalled();
    });
  });
});
