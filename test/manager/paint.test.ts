import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { PaintManager, IPaintManager } from '../../src/manager/paint';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IDisplayManager } from '../../src/manager/display';
import { IRecentManager } from '../../src/manager/recent';
import { Constants } from '../../src/models/constant';
import { TickerCategory, TickerTag } from '../../src/models/category';
import { WatchCategoryId } from '../../src/models/watch';
import { TickerTrend } from '../../src/models/ticker';

// Mock jQuery
const mockJQueryElement: any = {
  css: jest.fn(),
  closest: jest.fn(),
  find: jest.fn(),
  length: 1,
};
mockJQueryElement[0] = { isConnected: true };
mockJQueryElement.filter = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.closest = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.find = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.add = jest.fn().mockReturnValue(mockJQueryElement);
// Owned tag reconciliation needs sibling traversal and node removal
mockJQueryElement.siblings = jest.fn().mockReturnValue(mockJQueryElement);
mockJQueryElement.remove = jest.fn().mockReturnValue(mockJQueryElement);

const mockJQuery = jest.fn();
mockJQuery.mockReturnValue(mockJQueryElement);

(global as any).$ = mockJQuery;

// ── Purpose-built tag fixture ──
// Paint queries a fixed set of selectors. Rather than emulating CSS selection,
// this fixture maps those exact selector strings to nodes and implements only
// the child/sibling operations tag rendering needs.

/** Owned tag class names asserted by the tag tests (see manager/paint.ts). */
const TAG_CONTAINER_CLASS = 'aman-ticker-tag';
const TAG_CONTAINER_SELECTOR = `.${TAG_CONTAINER_CLASS}`;
const TAG_BADGE_CLASS = 'aman-ticker-tag__badge';
const TAG_BADGE_SELECTOR = `.${TAG_BADGE_CLASS}`;
const TAG_ATTRIBUTE = 'data-ticker-tag';
const TIMEFRAME_TOOLTIP = 'Timeframe Pending — YR timeframe not selected';
const FNO_TOOLTIP = 'F&O — Futures & Options';

/** One fixture element node. */
class FixtureNode {
  readonly attrs = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly children: FixtureNode[] = [];
  parent: FixtureNode | null = null;

  constructor(
    readonly classes: string[] = [],
    public textContent = ''
  ) {}

  hasClass(name: string): boolean {
    return this.classes.includes(name);
  }

  addChild(child: FixtureNode): void {
    child.parent = this;
    this.children.push(child);
  }

  detach(): void {
    const index = this.parent?.children.indexOf(this) ?? -1;
    if (index >= 0) {
      this.parent?.children.splice(index, 1);
    }
    this.parent = null;
  }
}

/** Matcher for the in-collection selectors paint passes to jQuery. */
function selectorMatcher(selector: string): (node: FixtureNode) => boolean {
  // Badge lookups use the exact attribute selector paint builds.
  const prefix = `[${TAG_ATTRIBUTE}="`;
  if (selector.startsWith(prefix) && selector.endsWith('"]')) {
    const tag = selector.slice(prefix.length, -2);
    return (node) => node.attrs.get(TAG_ATTRIBUTE) === tag;
  }
  if (selector === TAG_CONTAINER_SELECTOR) return (node) => node.hasClass(TAG_CONTAINER_CLASS);
  if (selector === TAG_BADGE_SELECTOR) return (node) => node.hasClass(TAG_BADGE_CLASS);
  if (selector === TickerArea.WATCHLIST.getItemSelector()) return (node) => node.hasClass('symbol-WatchRow');
  if (selector === TickerArea.SCREENER.getItemSelector()) return (node) => node.hasClass('row-RdUXZpkv');
  if (selector === TickerArea.WATCHLIST.getFlagSelector()) return (node) => node.hasClass('uiMarker');
  throw new Error(`Paint fixture has no matcher for selector: ${selector}`);
}

/** jQuery-like collection exposing only the operations paint uses. */
class FixtureQuery {
  constructor(readonly nodes: FixtureNode[]) {}

  get length(): number {
    return this.nodes.length;
  }

  css(prop: string | Record<string, string>, value?: string): this {
    for (const node of this.nodes) {
      if (typeof prop === 'string') {
        node.styles.set(prop, value ?? '');
      } else {
        Object.entries(prop).forEach(([key, val]) => node.styles.set(key, val));
      }
    }
    return this;
  }

  addClass(name: string): this {
    this.nodes.forEach((node) => node.classes.push(name));
    return this;
  }

  attr(name: string, value?: string): unknown {
    if (value === undefined) return this.nodes[0]?.attrs.get(name);
    this.nodes.forEach((node) => node.attrs.set(name, value));
    return this;
  }

  text(value: string): this {
    for (const node of this.nodes) node.textContent = value;
    return this;
  }

  filter(predicate: (index: number, element: FixtureNode) => boolean): FixtureQuery {
    return new FixtureQuery(this.nodes.filter((node, index) => predicate(index, node)));
  }

  /** Nearest ancestor-or-self matching the exact selector. */
  closest(selector: string): FixtureQuery {
    const matches = selectorMatcher(selector);
    const found = this.nodes
      .map((node) => {
        let current: FixtureNode | null = node;
        while (current !== null && !matches(current)) current = current.parent;
        return current;
      })
      .filter((node): node is FixtureNode => node !== null);
    return new FixtureQuery([...new Set(found)]);
  }

  /** Fixture rows keep their flag as a direct child, so find === children. */
  find(selector: string): FixtureQuery {
    return this.children(selector);
  }

  children(selector?: string): FixtureQuery {
    const matches = selector === undefined ? () => true : selectorMatcher(selector);
    return new FixtureQuery(this.nodes.flatMap((node) => node.children.filter(matches)));
  }

  siblings(selector?: string): FixtureQuery {
    const matches = selector === undefined ? () => true : selectorMatcher(selector);
    const found = this.nodes.flatMap((node) =>
      (node.parent?.children ?? []).filter((other) => other !== node && matches(other))
    );
    return new FixtureQuery([...new Set(found)]);
  }

  /** Insert directly after each node, in order. */
  after(query: FixtureQuery): this {
    for (const node of this.nodes) {
      const parent = node.parent;
      if (parent === null) continue;
      const index = parent.children.indexOf(node);
      query.nodes.forEach((child, offset) => {
        child.parent = parent;
        parent.children.splice(index + 1 + offset, 0, child);
      });
    }
    return this;
  }

  append(query: FixtureQuery): this {
    this.nodes.forEach((node) => query.nodes.forEach((child) => node.addChild(child)));
    return this;
  }

  remove(): this {
    [...this.nodes].forEach((node) => node.detach());
    return this;
  }

  first(): FixtureQuery {
    return new FixtureQuery(this.nodes.slice(0, 1));
  }

  each(callback: (index: number, element: FixtureNode) => void): this {
    this.nodes.forEach((node, index) => callback(index, node));
    return this;
  }
}

/** Top-level selector → fixture nodes map, rebuilt per fixture. */
let fixtureSelectors = new Map<string, FixtureNode[]>();

/** Stand-in for `$` that resolves only the selectors paint actually queries. */
function fixtureJQuery(target: string | FixtureNode | FixtureQuery): FixtureQuery {
  if (typeof target !== 'string') {
    return target instanceof FixtureQuery ? target : new FixtureQuery([target]);
  }
  if (target.startsWith('<')) return new FixtureQuery([new FixtureNode()]);
  const nodes = fixtureSelectors.get(target);
  if (nodes === undefined) throw new Error(`Paint fixture has no nodes for selector: ${target}`);
  return new FixtureQuery(nodes);
}

/** Watchlist/screener/header DOM used by the tag lifecycle tests. */
interface PaintFixture {
  rows: Map<string, FixtureNode>;
  symbols: Map<string, FixtureNode>;
  screenerRows: Map<string, FixtureNode>;
  header: FixtureNode;
}

function buildPaintFixture(tickers: string[]): PaintFixture {
  const rows = new Map<string, FixtureNode>();
  const symbols = new Map<string, FixtureNode>();
  const screenerRows = new Map<string, FixtureNode>();
  const screenerSymbols: FixtureNode[] = [];

  for (const ticker of tickers) {
    const row = new FixtureNode(['symbol-WatchRow']);
    const symbol = new FixtureNode(['symbolNameText'], ticker);
    row.addChild(symbol);
    row.addChild(new FixtureNode(['uiMarker']));
    rows.set(ticker, row);
    symbols.set(ticker, symbol);

    const screenerRow = new FixtureNode(['row-RdUXZpkv']);
    const screenerSymbol = new FixtureNode(['tickerName-GrtoTeat'], ticker);
    screenerRow.addChild(screenerSymbol);
    screenerRows.set(ticker, screenerRow);
    screenerSymbols.push(screenerSymbol);
  }

  const header = new FixtureNode(['mainTitle', 'withAction']);
  const headerFlag = new FixtureNode(['uiMarker']);
  const headerMarking = new FixtureNode();
  headerFlag.addChild(headerMarking);
  header.addChild(headerFlag);
  const exchange = new FixtureNode(['exchangeTitle']);
  header.addChild(exchange);

  fixtureSelectors = new Map<string, FixtureNode[]>([
    [TickerArea.WATCHLIST.getSymbolSelector(TickerVisibility.ALL), [...symbols.values()]],
    [TickerArea.SCREENER.getSymbolSelector(TickerVisibility.ALL), screenerSymbols],
    [Constants.DOM.BASIC.NAME, [header]],
    [Constants.DOM.FLAGS.MARKING, [headerMarking]],
    [Constants.DOM.BASIC.EXCHANGE, [exchange]],
  ]);

  return { rows, symbols, screenerRows, header };
}

describe('PaintManager', () => {
  let paintManager: IPaintManager;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDisplayManager: jest.Mocked<IDisplayManager>;
  let mockRecentManager: jest.Mocked<IRecentManager>;

  beforeEach(() => {
    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
      getCurrentExchange: jest.fn(),
      openTicker: jest.fn(),
      getTickers: jest.fn().mockReturnValue(new Set()),
      isScreenerVisible: jest.fn().mockReturnValue(false),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    mockCategoryManager = {
      getTickerCategory: jest.fn().mockResolvedValue({ watch: undefined, flag: undefined, tags: [] }),
      getBatchCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
    } as unknown as jest.Mocked<ICategoryManager>;

    // Wire getBatchCategory to delegate to getTickerCategory so paint tests
    // continue to work without additional setup in each test.
    (mockCategoryManager.getBatchCategory as jest.Mock).mockImplementation(
      async (tickers: string[]) => {
        const map = new Map<string, TickerCategory>();
        for (const t of tickers) {
          map.set(t, await mockCategoryManager.getTickerCategory(t));
        }
        return map;
      },
    );

    mockDisplayManager = {
      resolve: jest.fn().mockResolvedValue({ state: 'DEFAULT', color: Constants.UI.COLORS.DEFAULT }),
    } as unknown as jest.Mocked<IDisplayManager>;

    mockRecentManager = {
      markRecent: jest.fn(),
      isRecent: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<IRecentManager>;

    paintManager = new PaintManager(mockDomManager, mockCategoryManager, mockRecentManager, mockDisplayManager);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance successfully', () => {
      expect(paintManager).toBeDefined();
      expect(paintManager).toBeInstanceOf(PaintManager);
    });
  });

  describe('paint', () => {
    beforeEach(() => {
      mockJQueryElement.length = 1;
      mockJQueryElement.css.mockClear();
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, tags: [] });
    });

    it('should paint WATCHLIST area every time', async () => {
      await paintManager.paint();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
    });

    it('should paint SCREENER area when screener is visible', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);

      await paintManager.paint();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.SCREENER, TickerVisibility.ALL);
    });

    it('should skip SCREENER when screener is not visible', async () => {
      // isScreenerVisible already returns false by default
      await paintManager.paint();

      expect(mockDomManager.getTickers).not.toHaveBeenCalledWith(TickerArea.SCREENER, expect.anything());
    });

    it('should reset visual decals before repainting each area', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);

      await paintManager.paint();

      // Reset happens via jQuery css calls on the symbol selector
      expect(mockJQuery).toHaveBeenCalledWith(TickerArea.WATCHLIST.getSymbolSelector(TickerVisibility.ALL));
      expect(mockJQuery).toHaveBeenCalledWith(TickerArea.SCREENER.getSymbolSelector(TickerVisibility.ALL));
    });

    it('should repaint header after full paint', async () => {
      mockDomManager.getTicker.mockReturnValue('HEADER_TICKER');

      await paintManager.paint();

      // Header reads the current ticker
      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should delegate header name color to DisplayManager.resolve with simple request', async () => {
      mockDomManager.getTicker.mockReturnValue('HEADER_TICKER');
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
        flag: undefined,
        tags: [],
      });
      // Make resolve return a color so css is called
      mockDisplayManager.resolve.mockResolvedValue({ state: 'WATCH_CATEGORY' as any, color: 'red' });

      await paintManager.paint();

      expect(mockDisplayManager.resolve).toHaveBeenCalledWith('HEADER_TICKER');
    });

    it('should paint symbol color directly from watch category for watchlist/screener tickers', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
        flag: { id: 'SIDEWAYS' as any, color: 'orange', label: 'Sideways', update: { trend: TickerTrend.SIDEWAYS } },
        tags: [],
      });

      await paintManager.paint();

      // Symbol color painted directly (not via DisplayManager)
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
      // Flag color painted directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'orange');
      // DisplayManager NOT called for ticker symbols
      expect(mockDisplayManager.resolve).toHaveBeenCalledTimes(1); // only for header
    });
  });

  describe('paintTickers', () => {
    beforeEach(() => {
      mockJQueryElement.length = 1;
      mockJQueryElement.css.mockClear();
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);
      mockJQueryElement.closest.mockReturnValue(mockJQueryElement);
      mockJQueryElement.find.mockReturnValue(mockJQueryElement);
      mockDomManager.getTickers.mockReturnValue(new Set());
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, tags: [] });
    });

    it('should paint tickers in WATCHLIST area', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockCategoryManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL')
          return {
            watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
            flag: undefined,
            tags: [],
          };
        return { watch: undefined, flag: undefined, tags: [] };
      });
      mockDomManager.isScreenerVisible.mockReturnValue(false);

      await paintManager.paintTickers(['AAPL', 'GOOG']);

      // Should find tickers via filter (once per ticker per area)
      expect(mockJQueryElement.filter).toHaveBeenCalled();
      // AAPL gets painted red directly
      expect(mockJQueryElement.css).toHaveBeenCalledWith('color', 'red');
    });

    it('should also paint tickers in SCREENER when screener visible', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL']));

      await paintManager.paintTickers(['AAPL']);

      // Should have been called for WATCHLIST and SCREENER ticker lookups
      expect(mockJQueryElement.filter).toHaveBeenCalled();
    });

    it('should repaint header after targeted update', async () => {
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockDomManager.getTickers.mockReturnValue(new Set(['CURRENT']));

      await paintManager.paintTickers(['CURRENT']);

      // Header reset + paint uses css calls
      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should skip missing tickers without error', async () => {
      mockJQueryElement.length = 0;
      mockJQueryElement.filter.mockReturnValue(mockJQueryElement);

      await paintManager.paintTickers(['MISSING']);

      // Should not crash
    });

    it('should no-op on empty array', async () => {
      await paintManager.paintTickers([]);

      expect(mockJQueryElement.filter).not.toHaveBeenCalled();
    });
  });

  describe('ticker tags', () => {
    let fixture: PaintFixture;

    beforeEach(() => {
      fixture = buildPaintFixture(['NIFTY']);
      (global as any).$ = fixtureJQuery;
      mockDomManager.getTickers.mockReturnValue(new Set(['NIFTY']));
      mockDomManager.isScreenerVisible.mockReturnValue(false);
      mockDomManager.getTicker.mockReturnValue('CURRENT');
      mockCategoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, tags: [] });
    });

    afterEach(() => {
      (global as any).$ = mockJQuery;
    });

    /** Configure a categorized ticker carrying exactly the supplied tags. */
    const setTickerCategory = (tags: TickerTag[]): void => {
      mockCategoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
        flag: { id: 'SIDEWAYS' as any, color: 'orange', label: 'Sideways', update: { trend: TickerTrend.SIDEWAYS } },
        tags: [...tags],
      });
    };

    /** Owned tag containers sitting beside watchlist symbols. */
    const ownedContainers = (): FixtureNode[] =>
      [...fixture.rows.values()].flatMap((row) =>
        row.children.filter((child) => child.hasClass(TAG_CONTAINER_CLASS))
      );

    /** Badges inside the owned tag containers. */
    const ownedBadges = (): FixtureNode[] =>
      ownedContainers().flatMap((container) =>
        container.children.filter((child) => child.hasClass(TAG_BADGE_CLASS))
      );

    /** Sorted tag identities currently rendered as badges. */
    const renderedTags = (): TickerTag[] =>
      ownedBadges()
        .map((badge) => badge.attrs.get(TAG_ATTRIBUTE) as TickerTag)
        .sort();

    /** Badge glyph + tooltip expected per tag. */
    const TAG_CASES: ReadonlyArray<readonly [TickerTag, string, string]> = [
      [TickerTag.TIMEFRAME_PENDING, '🕒', TIMEFRAME_TOOLTIP],
      [TickerTag.FNO, '○', FNO_TOOLTIP],
    ];

    it.each(TAG_CASES)('should render the %s badge beside the watchlist symbol', async (tag, icon, tooltip) => {
      setTickerCategory([tag]);

      await paintManager.paint();

      const symbol = fixture.symbols.get('NIFTY')!;
      const row = fixture.rows.get('NIFTY')!;

      // Container is an owned sibling of the symbol, never inside it
      expect(ownedContainers()).toHaveLength(1);
      expect(ownedContainers()[0].parent).toBe(row);
      expect(row.children.indexOf(ownedContainers()[0])).toBe(row.children.indexOf(symbol) + 1);
      expect(symbol.children).toHaveLength(0);

      // Badge carries the tag identity, glyph and tooltip
      expect(ownedBadges()).toHaveLength(1);
      expect(ownedBadges()[0].textContent).toBe(icon);
      expect(ownedBadges()[0].attrs.get(TAG_ATTRIBUTE)).toBe(tag);
      expect(ownedBadges()[0].attrs.get('title')).toBe(tooltip);

      // Host symbol text and row content are unaffected
      expect(symbol.textContent).toBe('NIFTY');
      expect(row.children).toHaveLength(3);
      const flag = row.children.find((child) => child.hasClass('uiMarker'))!;
      expect(flag).toBeDefined();

      // Host color + flag painting still applies; tags never paint a border
      expect(symbol.styles.get('color')).toBe('red');
      expect(symbol.styles.has('border-top-style')).toBe(false);
      expect(flag.styles.get('color')).toBe('orange');
    });

    it('should keep one container with both badges across repeated full and targeted paints', async () => {
      const row = fixture.rows.get('NIFTY')!;
      const foreign = new FixtureNode(['host-extra'], 'EXTRA');
      row.addChild(foreign);
      setTickerCategory([TickerTag.TIMEFRAME_PENDING, TickerTag.FNO]);

      await paintManager.paint();
      await paintManager.paint();
      await paintManager.paintTickers(['NIFTY']);
      await paintManager.paintTickers(['NIFTY']);

      // Only owned tag nodes are reconciled; foreign and host nodes survive
      expect(ownedContainers()).toHaveLength(1);
      expect(ownedBadges()).toHaveLength(2);
      expect(renderedTags()).toEqual([TickerTag.FNO, TickerTag.TIMEFRAME_PENDING]);
      expect(row.children).toContain(foreign);
      expect(row.children).toHaveLength(4);
      expect(fixture.symbols.get('NIFTY')!.textContent).toBe('NIFTY');
    });

    it('should reconcile tag subsets and remove the container when no tags remain', async () => {
      setTickerCategory([TickerTag.TIMEFRAME_PENDING, TickerTag.FNO]);
      await paintManager.paint();
      expect(ownedBadges()).toHaveLength(2);

      // Dropping FNO preserves the clock badge
      setTickerCategory([TickerTag.TIMEFRAME_PENDING]);
      await paintManager.paintTickers(['NIFTY']);
      expect(ownedContainers()).toHaveLength(1);
      expect(renderedTags()).toEqual([TickerTag.TIMEFRAME_PENDING]);

      // Dropping the clock instead preserves the FNO badge
      setTickerCategory([TickerTag.FNO]);
      await paintManager.paintTickers(['NIFTY']);
      expect(ownedContainers()).toHaveLength(1);
      expect(renderedTags()).toEqual([TickerTag.FNO]);

      // Restoring both reuses the same container
      setTickerCategory([TickerTag.TIMEFRAME_PENDING, TickerTag.FNO]);
      await paintManager.paintTickers(['NIFTY']);
      expect(ownedContainers()).toHaveLength(1);
      expect(ownedBadges()).toHaveLength(2);

      // Empty tags drop the owned container entirely
      setTickerCategory([]);
      await paintManager.paintTickers(['NIFTY']);
      expect(ownedContainers()).toHaveLength(0);
      expect(ownedBadges()).toHaveLength(0);

      const row = fixture.rows.get('NIFTY')!;
      expect(row.children).toHaveLength(2);
      expect(fixture.symbols.get('NIFTY')!.textContent).toBe('NIFTY');
    });

    it('should not render badges or borders for screener rows or the ticker header', async () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);
      setTickerCategory([TickerTag.TIMEFRAME_PENDING, TickerTag.FNO]);

      await paintManager.paint();
      await paintManager.paintTickers(['NIFTY']);

      const screenerRow = fixture.screenerRows.get('NIFTY')!;
      expect(screenerRow.children.filter((child) => child.hasClass(TAG_CONTAINER_CLASS))).toHaveLength(0);
      expect(fixture.header.children.filter((child) => child.hasClass(TAG_CONTAINER_CLASS))).toHaveLength(0);
      expect(ownedContainers()).toHaveLength(1);
      expect(ownedContainers()[0].parent).toBe(fixture.rows.get('NIFTY'));

      // No tag-driven border on watchlist symbol, screener symbol or header
      expect(fixture.symbols.get('NIFTY')!.styles.has('border-top-style')).toBe(false);
      const screenerSymbol = screenerRow.children.find((child) => child.textContent === 'NIFTY')!;
      expect(screenerSymbol.styles.has('border-top-style')).toBe(false);
      expect(fixture.header.styles.has('border-top-style')).toBe(false);
    });

    it('should not create badges when the watchlist row is missing', async () => {
      setTickerCategory([TickerTag.TIMEFRAME_PENDING, TickerTag.FNO]);

      await paintManager.paintTickers(['MISSING']);

      expect(ownedContainers()).toHaveLength(0);
      expect(ownedBadges()).toHaveLength(0);
    });
  });

  describe('summarizeBuckets', () => {
    beforeEach(() => {
      mockJQueryElement.css.mockClear();
    });

    it('should summarize WATCHLIST buckets without painting DOM', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOG']));
      mockCategoryManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'AAPL')
          return {
            watch: { id: WatchCategoryId.READY, color: 'red', label: 'Ready', recordUpdate: null },
            flag: undefined,
            tags: [],
          };
        return { watch: undefined, flag: undefined, tags: [] };
      });

      const result = await paintManager.summarizeBuckets();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(TickerArea.WATCHLIST, TickerVisibility.ALL);
      expect(result.buckets.get(WatchCategoryId.READY)).toBe(1);
      expect(result.uncategorizedCount).toBe(1);
      expect(mockJQuery).not.toHaveBeenCalled();
    });

    it('should handle empty area without error', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      const result = await paintManager.summarizeBuckets();

      expect(result.buckets.size).toBe(0);
      expect(result.uncategorizedCount).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty ticker set in paint', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set());

      await paintManager.paint();

      // No crash
    });
  });
});
