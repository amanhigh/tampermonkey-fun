import { BaseManager, IBaseManager, PageFetcher, ItemExtractor } from '../../src/manager/base';
import { PaginationMetadata } from '../../src/models/api';

/** Concrete subclass for testing the abstract BaseManager. */
class TestManager extends BaseManager {}

/** Minimal page envelope used by tests — satisfies PageConstraint. */
interface TestPage {
  items: string[];
  metadata: PaginationMetadata;
}

describe('BaseManager', () => {
  let manager: IBaseManager;

  beforeEach(() => {
    manager = new TestManager();
  });

  describe('listAllPages', () => {
    describe('single page', () => {
      it('should return all items when they fit in one page', async () => {
        const fetchPage: PageFetcher<TestPage> = jest.fn().mockResolvedValue({
          items: ['a', 'b', 'c'],
          metadata: { total: 3, offset: 0, limit: 100 },
        });

        const extractItems: ItemExtractor<TestPage, string> = (page) => page.items;

        const result = await manager.listAllPages(fetchPage, extractItems);

        expect(result).toEqual(['a', 'b', 'c']);
        expect(fetchPage).toHaveBeenCalledTimes(1);
        expect(fetchPage).toHaveBeenCalledWith(0, 100);
      });
    });

    describe('multiple pages with offsets and order', () => {
      it('should aggregate pages and preserve item order', async () => {
        const fetchPage: PageFetcher<TestPage> = jest
          .fn()
          .mockResolvedValueOnce({
            items: ['a', 'b'],
            metadata: { total: 5, offset: 0, limit: 2 },
          })
          .mockResolvedValueOnce({
            items: ['c', 'd'],
            metadata: { total: 5, offset: 2, limit: 2 },
          })
          .mockResolvedValueOnce({
            items: ['e'],
            metadata: { total: 5, offset: 4, limit: 2 },
          });

        const extractItems: ItemExtractor<TestPage, string> = (page) => page.items;

        const result = await manager.listAllPages(fetchPage, extractItems, 2);

        expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(fetchPage).toHaveBeenCalledTimes(3);
        expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 2);
        expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
        expect(fetchPage).toHaveBeenNthCalledWith(3, 4, 2);
      });

      it('should stop early when items >= total before exhausting pages', async () => {
        // API returns more items than total indicates
        const fetchPage: PageFetcher<TestPage> = jest
          .fn()
          .mockResolvedValueOnce({
            items: ['a', 'b', 'c'],
            metadata: { total: 3, offset: 0, limit: 2 },
          });

        const extractItems: ItemExtractor<TestPage, string> = (page) => page.items;

        const result = await manager.listAllPages(fetchPage, extractItems);

        expect(result).toEqual(['a', 'b', 'c']);
        expect(fetchPage).toHaveBeenCalledTimes(1);
      });
    });

    describe('empty result', () => {
      it('should return empty array when total is 0', async () => {
        const fetchPage: PageFetcher<TestPage> = jest.fn().mockResolvedValue({
          items: [],
          metadata: { total: 0, offset: 0, limit: 100 },
        });

        const extractItems: ItemExtractor<TestPage, string> = (page) => page.items;

        const result = await manager.listAllPages(fetchPage, extractItems);

        expect(result).toEqual([]);
        expect(fetchPage).toHaveBeenCalledTimes(1);
      });
    });

    describe('custom extractor and page limit', () => {
      it('should use provided page limit and custom extractors', async () => {
        const fetchPage: PageFetcher<TestPage> = jest
          .fn()
          .mockResolvedValueOnce({
            items: ['x', 'y'],
            metadata: { total: 4, offset: 0, limit: 2 },
          })
          .mockResolvedValueOnce({
            items: ['z', 'w'],
            metadata: { total: 4, offset: 2, limit: 2 },
          });

        // Custom extractor that uppercases items
        const extractItems: ItemExtractor<TestPage, string> = (page) =>
          page.items.map((i) => i.toUpperCase());

        const result = await manager.listAllPages(fetchPage, extractItems, 2);

        expect(result).toEqual(['X', 'Y', 'Z', 'W']);
        expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 2);
        expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
      });
    });

    describe('rejected fetch', () => {
      it('should propagate errors from fetchPage unchanged', async () => {
        const fetchPage: PageFetcher<TestPage> = jest
          .fn()
          .mockRejectedValueOnce(new Error('Network failure'));

        const extractItems: ItemExtractor<TestPage, string> = (page) => page.items;

        await expect(manager.listAllPages(fetchPage, extractItems)).rejects.toThrow('Network failure');
      });
    });
  });
});
