import { FlagHandler, IFlagHandler } from '../../src/handler/flag';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IPaintManager } from '../../src/manager/paint';
import { FlagCategoryId } from '../../src/models/flag';

describe('FlagHandler', () => {
  let handler: IFlagHandler;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
    } as unknown as jest.Mocked<IDomManager>;

    mockPaintManager = {
      paintTickers: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    handler = new FlagHandler(mockCategoryManager, mockDomManager, mockPaintManager);
  });

  describe('recordSelectedTicker', () => {
    it('should record current ticker in flag category', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockCategoryManager.recordFlagCategory).toHaveBeenCalledWith(FlagCategoryId.SIDEWAYS, ['CURRENT']);
    });

    it('should call paintTickers with current ticker', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['CURRENT']);
    });
  });
});
