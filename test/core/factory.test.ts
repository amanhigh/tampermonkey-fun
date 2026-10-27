import { Factory } from '../../src/core/factory';
import { Constants } from '../../src/models/constant';

// Minimal mocks for instantiation only (no runtime operations)
(global as any).$ = jest.fn(() => ({
  empty: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  css: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  click: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  addClass: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis(),
  length: 0,
  has: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  mousedown: jest.fn().mockReturnThis(),
  contextmenu: jest.fn().mockReturnThis(),
  toArray: jest.fn().mockReturnValue([]),
}));

(global as any).GM = {
  getValue: jest.fn().mockResolvedValue(undefined),
  setValue: jest.fn().mockResolvedValue(undefined),
};

/**
 * Integration test: Verifies Factory.app.barkat() can be fully instantiated
 * without hitting cyclic dependency stack overflow (RangeError).
 *
 * Barkat is the top-level app that transitively depends on ALL handlers,
 * managers, repos, and audit components. Construction succeeding means the
 * exercised graph builds without a stack overflow; it does not prove that no
 * import cycle exists anywhere in the project.
 */
describe('Factory Integration - Cyclic Dependency Detection', () => {
  beforeEach(() => {
    // Reset singleton cache to force fresh instantiation
    (Factory as any).instances = {};
  });

  it('should build barkat without cyclic dependency stack overflow', () => {
    expect(() => Factory.app.barkat()).not.toThrow();
  });
});

describe('Factory Client Providers', () => {
  beforeEach(() => {
    (Factory as any).instances = {};
  });

  it('should provide singleton InvestingClient', () => {
    const investing = Factory.client.investing();
    expect(investing).toBeDefined();
    expect(investing.getBaseUrl()).toBe('https://in.investing.com');

    // Verify singleton behavior
    const investingAgain = Factory.client.investing();
    expect(investing).toBe(investingAgain);
  });

  it('should provide singleton KiteClient', () => {
    const kite = Factory.client.kite();
    expect(kite).toBeDefined();
    expect(kite.getBaseUrl()).toBe('https://kite.zerodha.com/oms/gtt');

    // Verify singleton behavior
    const kiteAgain = Factory.client.kite();
    expect(kite).toBe(kiteAgain);
  });

  it('should provide singleton JournalClient', () => {
    const journal = Factory.client.journal();
    expect(journal).toBeDefined();
    expect(journal.getBaseUrl()).toBe('http://localhost:9010/v1/api');

    // Verify singleton behavior
    const journalAgain = Factory.client.journal();
    expect(journal).toBe(journalAgain);
  });

  it('should provide singleton OsClient', () => {
    const os = Factory.client.os();
    expect(os).toBeDefined();
    expect(os.getBaseUrl()).toBe('http://localhost:9010/v1/api');

    // Verify singleton behavior
    const osAgain = Factory.client.os();
    expect(os).toBe(osAgain);
  });

  it('should provide singleton TickerClient', () => {
    const ticker = Factory.client.ticker();
    expect(ticker).toBeDefined();
    expect(ticker.getBaseUrl()).toBe('http://localhost:9010/v1/api');

    // Verify singleton behavior
    const tickerAgain = Factory.client.ticker();
    expect(ticker).toBe(tickerAgain);
  });

  it('should provide singleton PriceAlertClient', () => {
    const priceAlert = Factory.client.priceAlert();
    expect(priceAlert).toBeDefined();
    expect(priceAlert.getBaseUrl()).toBe('http://localhost:9010/v1/api');

    // Verify singleton behavior
    const priceAlertAgain = Factory.client.priceAlert();
    expect(priceAlert).toBe(priceAlertAgain);
  });

  it('should provide singleton AuditClient', () => {
    const audit = Factory.client.audit();
    expect(audit).toBeDefined();
    expect(audit.getBaseUrl()).toBe('http://localhost:9010/v1/api');

    // Verify singleton behavior
    const auditAgain = Factory.client.audit();
    expect(audit).toBe(auditAgain);
  });

  it('should provide singleton BarkatClient on its own base URL', () => {
    const barkat = Factory.client.barkat();
    expect(barkat).toBeDefined();
    expect(barkat.getBaseUrl()).toBe(Constants.BARKAT.BASE_URL);

    // Verify singleton behavior
    const barkatAgain = Factory.client.barkat();
    expect(barkat).toBe(barkatAgain);

    // Barkat is a separate backend from Kohan
    expect(barkat.getBaseUrl()).not.toBe(Constants.KOHAN.BASE_URL);
  });
});

describe('Factory IMDb Providers', () => {
  beforeEach(() => {
    (Factory as any).instances = {};
  });

  it('should provide singleton IMDb manager and handler', () => {
    const manager = Factory.manager.imdb();
    const handler = Factory.handler.imdb();

    expect(manager).toBeDefined();
    expect(Factory.manager.imdb()).toBe(manager);
    expect(handler).toBeDefined();
    expect(Factory.handler.imdb()).toBe(handler);
  });
});

describe('Factory Seer Providers', () => {
  beforeEach(() => {
    (Factory as any).instances = {};
  });

  it('should provide singleton Seer client, manager, search manager, search handler, handler and app without IO', () => {
    const globalSpy = jest.spyOn(Factory.handler, 'global');

    try {
      const client = Factory.client.seer();
      const manager = Factory.manager.seer();
      const search = Factory.manager.search();
      const searchHandler = Factory.handler.search();
      const handler = Factory.handler.seer();
      const app = Factory.app.seer();

      expect(client).toBeDefined();
      expect(manager).toBeDefined();
      expect(search).toBeDefined();
      expect(searchHandler).toBeDefined();
      expect(handler).toBeDefined();
      expect(app).toBeDefined();

      // Verify singleton behavior: construction must not start any runtime work
      expect(Factory.client.seer()).toBe(client);
      expect(Factory.manager.seer()).toBe(manager);
      expect(Factory.manager.search()).toBe(search);
      expect(Factory.handler.search()).toBe(searchHandler);
      expect(Factory.handler.seer()).toBe(handler);
      expect(Factory.app.seer()).toBe(app);

      // Seer must not depend on the global error handler
      expect(globalSpy).not.toHaveBeenCalled();
    } finally {
      globalSpy.mockRestore();
    }
  });
});
