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
      recordWatchCategory: jest.fn().mockResolvedValue(undefined),
      recordFlagCategory: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
    } as unknown as jest.Mocked<IDomManager>;

    mockPaintManager = {
      paintTickers: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPaintManager>;

    handler = new FlagHandler(mockCategoryManager, mockDomManager, mockPaintManager);
  });

  describe('recordSelectedTicker', () => {
    it('should record current ticker in flag category', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockCategoryManager.recordFlagCategory).toHaveBeenCalledWith(FlagCategoryId.SIDEWAYS, ['CURRENT']);
    });

    it('should call paintTickers with current ticker after category update resolves', async () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      // Wait for internal async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['CURRENT']);
    });

    it('should not paint before recordFlagCategory resolves', async () => {
      let resolveRecord!: () => void;
      mockCategoryManager.recordFlagCategory.mockReturnValue(
        new Promise((resolve) => { resolveRecord = resolve; })
      );

      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      // Paint should NOT be called while record is still pending
      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();

      // Resolve and flush microtasks
      resolveRecord();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Paint should be called after record resolves
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['CURRENT']);
    });
  });
});
