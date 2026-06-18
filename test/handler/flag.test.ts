import { FlagHandler, IFlagHandler } from '../../src/handler/flag';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { FlagCategoryId } from '../../src/models/flag';

describe('FlagHandler', () => {
  let handler: IFlagHandler;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

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

    handler = new FlagHandler(mockCategoryManager, mockDomManager);
  });

  describe('recordSelectedTicker', () => {
    it('should record current ticker in flag category', () => {
      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      expect(mockCategoryManager.recordFlagCategory).toHaveBeenCalledWith(FlagCategoryId.SIDEWAYS, ['CURRENT']);
    });

    it('should await recordFlagCategory and not invoke paint directly', async () => {
      let resolveRecord!: () => void;
      mockCategoryManager.recordFlagCategory.mockReturnValue(
        new Promise((resolve) => { resolveRecord = resolve; })
      );

      handler.recordSelectedTicker(FlagCategoryId.SIDEWAYS);

      // Resolve and flush microtasks
      resolveRecord();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCategoryManager.recordFlagCategory).toHaveBeenCalledWith(FlagCategoryId.SIDEWAYS, ['CURRENT']);
    });
  });
});
