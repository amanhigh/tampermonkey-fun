import { ISeerClient } from '../../src/client/seer';
import { ISearchManager, SearchManager } from '../../src/manager/search';
import { ApiError } from '../../src/models/api_error';
import { Constants } from '../../src/models/constant';

/** Detail route used by the search-url tests. */
const MOVIE_ROUTE = '/movie/603';

/** Airtel Xstream origin shared by every expectation. */
const AIRTEL = Constants.SEER.AIRTEL_BASE_URL;

/** Marker every opened search url carries; detail destinations never carry it. */
const MARKER = Constants.SEER.AUTO_MARKER;

/** Verified grid result destination of the fixture title. */
const AVATAR_URL = `${AIRTEL}/movies/avatar/HOTSTAR_DTH_MOVIE_3617`;

/** Verified hero result destination of the fixture title. */
const HALO_URL = `${AIRTEL}/tv-shows/halo/HOTSTAR_DTH_TVSHOW_1971308176`;

/** Element stand-in covering the DOM surface read by the result matcher. */
class FakeNode {
  parentElement: FakeNode | null = null;
  readonly children: FakeNode[] = [];

  constructor(
    private readonly attributes: Record<string, string> = {},
    private readonly className = '',
    readonly textContent = ''
  ) {}

  /** Read a rendered attribute, mirroring the DOM api. */
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  /** Append a child and link it back to this node. */
  append(child: FakeNode): this {
    child.parentElement = this;
    this.children.push(child);
    return this;
  }

  /** Match a single class selector against the direct children. */
  querySelector(selector: string): FakeNode | null {
    const name = selector.replace(/^\./, '');
    return this.children.find((child) => child.className === name) ?? null;
  }
}

/** Search result container stand-in answering the grid and hero selectors. */
class FakeResultRoot {
  constructor(
    private readonly grid: FakeNode[] = [],
    private readonly hero: FakeNode[] = []
  ) {}

  /** Answer the two scoped selectors the matcher issues. */
  querySelectorAll(selector: string): FakeNode[] {
    if (selector.includes('cs-grid-tile')) {
      return this.grid;
    }
    return selector.includes('hero-banner') ? this.hero : [];
  }
}

/** Grid tile anchor carrying its rendered title node. */
function gridAnchor(href: string, title?: string): FakeNode {
  const anchor = new FakeNode({ href });
  if (title !== undefined) {
    anchor.append(new FakeNode({}, 'cs-grid-tile-title', title));
  }
  return anchor;
}

/** Grid tile anchor labelled only through aria-label. */
function labelledAnchor(href: string, label: string): FakeNode {
  return new FakeNode({ href, 'aria-label': label });
}

/** Hero banner anchor whose wrapper carries the sibling title node. */
function heroAnchor(href: string, title?: string): FakeNode {
  const wrapper = new FakeNode();
  const anchor = new FakeNode({ href }, 'hero-banner');
  wrapper.append(anchor);
  if (title !== undefined) {
    wrapper.append(new FakeNode({}, 'hero-title', title));
  }
  return anchor;
}

/** Run the matcher against a stand-in root. */
function match(root: FakeResultRoot | FakeNode, title: string): string | undefined {
  return manager.findXstreamMatch(root as unknown as ParentNode, title);
}

let manager: ISearchManager;
let client: jest.Mocked<ISeerClient>;

beforeEach(() => {
  client = {
    getBaseUrl: jest.fn().mockReturnValue('http://seerr.media.lan/api/v1'),
    getDeleteTarget: jest.fn(),
    getSearchTitle: jest.fn().mockResolvedValue('Dune'),
    deleteFiles: jest.fn().mockResolvedValue(undefined),
    deleteRequest: jest.fn().mockResolvedValue(undefined),
    deleteMedia: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISeerClient>;

  manager = new SearchManager(client);
});

describe('SearchManager', () => {
  describe('getXstreamUrl', () => {
    it('builds the Airtel search url from the movie title of the canonical route', async () => {
      client.getSearchTitle.mockResolvedValue('Dune');

      await expect(manager.getXstreamUrl('/movie/603/')).resolves.toBe(`${AIRTEL}/search?q=Dune${MARKER}`);

      expect(client.getSearchTitle).toHaveBeenCalledWith('/movie/603');
    });

    it('canonicalizes a nested season route before resolving the title', async () => {
      client.getSearchTitle.mockResolvedValue('Shogun');

      await expect(manager.getXstreamUrl('/tv/1399/season/2')).resolves.toBe(`${AIRTEL}/search?q=Shogun${MARKER}`);

      expect(client.getSearchTitle).toHaveBeenCalledWith('/tv/1399');
    });

    it('encodes the resolved title in the query', async () => {
      client.getSearchTitle.mockResolvedValue('Dune: Part Two & More');

      await expect(manager.getXstreamUrl('/movie/603')).resolves.toBe(
        `${AIRTEL}/search?q=Dune%3A%20Part%20Two%20%26%20More${MARKER}`
      );
    });

    it.each(['/discover', '/movie/0', 'movie/603'])(
      'rejects the unsupported route %s before any API call',
      async (pathname: string) => {
        await expect(manager.getXstreamUrl(pathname)).rejects.toThrow(`Unsupported Seer route: ${pathname}`);

        expect(client.getSearchTitle).not.toHaveBeenCalled();
      }
    );

    it('deletes nothing while resolving the search url', async () => {
      client.getSearchTitle.mockResolvedValue('Dune');

      await manager.getXstreamUrl(MOVIE_ROUTE);

      expect(client.deleteFiles).not.toHaveBeenCalled();
      expect(client.deleteRequest).not.toHaveBeenCalled();
      expect(client.deleteMedia).not.toHaveBeenCalled();
    });

    it('propagates a title resolution failure unchanged', async () => {
      client.getSearchTitle.mockRejectedValue(new ApiError(500, 'Server Error'));

      await expect(manager.getXstreamUrl(MOVIE_ROUTE)).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('findXstreamMatch', () => {
    it('returns the single grid result whose rendered title matches exactly', () => {
      const root = new FakeResultRoot([
        gridAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617', 'Avatar'),
        gridAnchor('/movies/dune/HOTSTAR_DTH_MOVIE_9', 'Dune'),
      ]);

      expect(match(root, 'Avatar')).toBe(AVATAR_URL);
    });

    it('returns the hero result matched through its sibling title', () => {
      const root = new FakeResultRoot([], [heroAnchor('/tv-shows/halo/HOTSTAR_DTH_TVSHOW_1971308176', 'Halo')]);

      expect(match(root, 'Halo')).toBe(HALO_URL);
    });

    it('falls back to the aria-label of a grid result link', () => {
      const root = new FakeResultRoot([labelledAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617', 'Avatar')]);

      expect(match(root, 'Avatar')).toBe(AVATAR_URL);
    });

    it('matches the full decoded slug when the rendered title differs', () => {
      const root = new FakeResultRoot([
        gridAnchor('/tv-shows/halo/HOTSTAR_DTH_TVSHOW_1971308176', 'Halo: The Series'),
      ]);

      expect(match(root, 'Halo')).toBe(HALO_URL);
    });

    it('matches a percent encoded slug after decoding it', () => {
      const root = new FakeResultRoot([gridAnchor('/movies/la%20casa/HOTSTAR_DTH_MOVIE_7', 'Other')]);

      expect(match(root, 'La Casa')).toBe(`${AIRTEL}/movies/la%20casa/HOTSTAR_DTH_MOVIE_7`);
    });

    it('ignores accents, case and punctuation on both sides of the comparison', () => {
      const root = new FakeResultRoot([
        gridAnchor('/movies/amelie/HOTSTAR_DTH_MOVIE_5', 'AMÉLIE!'),
        heroAnchor('/tv-shows/andor/HOTSTAR_DTH_TVSHOW_6', 'Andor & Friends'),
      ]);

      expect(match(root, 'amelie')).toBe(`${AIRTEL}/movies/amelie/HOTSTAR_DTH_MOVIE_5`);
      expect(match(root, 'Andor and Friends')).toBe(`${AIRTEL}/tv-shows/andor/HOTSTAR_DTH_TVSHOW_6`);
    });

    it('keeps non latin letters and digits while comparing', () => {
      const root = new FakeResultRoot([gridAnchor('/movies/nayakan/HOTSTAR_DTH_MOVIE_4', 'நாயகன் 2')]);

      expect(match(root, 'நாயகன் 2')).toBe(`${AIRTEL}/movies/nayakan/HOTSTAR_DTH_MOVIE_4`);
    });

    it.each([
      ['a longer title', 'Avatar', 'Avatar 2', '/movies/avatar2/HOTSTAR_DTH_MOVIE_11'],
      ['a longer slug', 'Avatar', 'Other', '/movies/avatar-2/HOTSTAR_DTH_MOVIE_11'],
      ['a shorter title', 'Avatar', 'Ava', '/movies/ava/HOTSTAR_DTH_MOVIE_3617'],
      ['a partial slug', 'Avat', 'Other', '/movies/avatar/HOTSTAR_DTH_MOVIE_3617'],
    ])('rejects %s instead of matching a substring', (_case: string, title: string, label: string, href: string) => {
      const root = new FakeResultRoot([gridAnchor(href, label)]);

      expect(match(root, title)).toBeUndefined();
    });

    it('collapses results that resolve to the same destination path', () => {
      const root = new FakeResultRoot([
        gridAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617?utm=grid', 'Avatar'),
        heroAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617#hero', 'Avatar'),
      ]);

      expect(match(root, 'Avatar')).toBe(AVATAR_URL);
    });

    it('returns undefined when several distinct destinations match', () => {
      const root = new FakeResultRoot(
        [gridAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617', 'Avatar')],
        [heroAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_9999', 'Avatar')]
      );

      expect(match(root, 'Avatar')).toBeUndefined();
    });

    it('returns undefined when nothing matches', () => {
      const root = new FakeResultRoot([gridAnchor('/movies/dune/HOTSTAR_DTH_MOVIE_9', 'Dune')], []);

      expect(match(root, 'Avatar')).toBeUndefined();
    });

    it('returns undefined for an empty title without reading the results', () => {
      const root = new FakeResultRoot([gridAnchor('/movies/avatar/HOTSTAR_DTH_MOVIE_3617', 'Avatar')]);

      expect(match(root, '  ')).toBeUndefined();
    });

    it.each([
      ['an insecure origin', 'http://www.airtelxstream.in/movies/avatar/HOTSTAR_DTH_MOVIE_3617'],
      ['a foreign origin', 'https://www.airtelxstream.in.evil.test/movies/avatar/HOTSTAR_DTH_MOVIE_3617'],
      ['a non https scheme', 'javascript:alert(1)'],
      ['credentials', 'https://user:pass@www.airtelxstream.in/movies/avatar/HOTSTAR_DTH_MOVIE_3617'],
      ['malformed percent encoding', 'https://www.airtelxstream.in/movies/avatar%2/HOTSTAR_DTH_MOVIE_3617'],
      ['a search path', 'https://www.airtelxstream.in/search?q=Avatar'],
      ['a missing media id', 'https://www.airtelxstream.in/movies/avatar'],
      ['an extra path segment', 'https://www.airtelxstream.in/movies/avatar/HOTSTAR_DTH_MOVIE_3617/trailer'],
      ['an unverified media type', 'https://www.airtelxstream.in/shows/avatar/HOTSTAR_DTH_MOVIE_3617'],
      ['an empty href', ''],
    ])('rejects %s', (_case: string, href: string) => {
      const root = new FakeResultRoot([gridAnchor(href, 'Avatar')]);

      expect(match(root, 'Avatar')).toBeUndefined();
    });
  });
});
