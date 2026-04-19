import { SequenceHandler } from '../../src/handler/sequence';
import { ISequenceManager } from '../../src/manager/sequence';
import { ITickerManager } from '../../src/manager/ticker';
import { ISymbolManager } from '../../src/manager/symbol';
import { IPairManager } from '../../src/manager/pair';
import { PairInfo } from '../../src/models/alert';
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
  let mockPairManager: jest.Mocked<IPairManager>;
  let mockDisplayInput: any;

  beforeEach(() => {
    mockSequenceManager = {
      getCurrentSequence: jest.fn(),
      flipSequence: jest.fn(),
      toggleFreezeSequence: jest.fn(),
    } as any;

    mockTickerManager = {
      getTicker: jest.fn(),
    } as any;

    mockSymbolManager = {
      tvToInvesting: jest.fn(),
    } as any;

    mockPairManager = {
      investingTickerToPairInfo: jest.fn(),
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
      mockPairManager
    );
  });

  describe('displaySequence', () => {
    it('should display ticker:sequence when ticker is not mapped', () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue(null);

      sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('TVTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'maroon');
    });

    it('should display ticker:sequence:PairName when ticker is mapped with pair name', () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.YR);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue('INVESTINGTICKER');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(
        new PairInfo('NIFTY 50', '123', 'NSE', 'NIFTY')
      );

      sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:YR:NIFTY 50');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'blue');
    });

    it('should display ticker:sequence when ticker is mapped but no pair name', () => {
      mockSequenceManager.getCurrentSequence.mockReturnValue(SequenceType.MWD);
      mockTickerManager.getTicker.mockReturnValue('TVTICKER');
      mockSymbolManager.tvToInvesting.mockReturnValue('INVESTINGTICKER');
      mockPairManager.investingTickerToPairInfo.mockReturnValue(null);

      sequenceHandler.displaySequence();

      expect(mockDisplayInput.val).toHaveBeenCalledWith('INVESTINGTICKER:MWD');
      expect(mockDisplayInput.css).toHaveBeenCalledWith('background-color', 'black');
    });
  });
});
