import { FlagHandler, IFlagHandler } from '../../src/handler/flag';
import { IFlagManager } from '../../src/manager/flag';
import { IDomManager } from '../../src/manager/dom';
import { IPaintManager } from '../../src/manager/paint';
import { FlagCategoryId } from '../../src/models/flag';

describe('FlagHandler', () => {
  let handler: IFlagHandler;
  let mockFlagManager: jest.Mocked<IFlagManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFlagManager = {
      getTickerCategory: jest.fn(),
      recordCategory: jest.fn(),
    } as unknown as jest.Mocked<IFlagManager>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
      isScreenerVisible: jest.fn().mockReturnValue(false),
      getCurrentExchange: jest.fn(),
      getTickers: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    mockPaintManager = {
      resetArea: jest.fn(),
      paintArea: jest.fn(),
      paintTickers: jest.fn().mockResolvedValue(undefined),
      summarizeBuckets: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    handler = new FlagHandler(mockFlagManager, mockDomManager, mockPaintManager);
  });

  describe('recordSelectedTicker', () => {
    it('should record current ticker in flag category', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockFlagManager.recordCategory).toHaveBeenCalledWith(FlagCategoryId.SIDEWAYS, ['CURRENT']);
    });

    it('should call paintTickers with current ticker', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['CURRENT']);
    });
  });
});
