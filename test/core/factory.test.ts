// Mock experiment.ts to prevent top-level RunBarkat() call during import
jest.mock('../../src/core/experiment', () => ({}));

import { Factory } from '../../src/core/factory';

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
 * managers, repos, and audit components. If it builds, no cycles exist.
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
    expect(journal.getBaseUrl()).toBe('http://localhost:9091/v1/api');

    // Verify singleton behavior
    const journalAgain = Factory.client.journal();
    expect(journal).toBe(journalAgain);
  });

  it('should provide singleton OsClient', () => {
    const os = Factory.client.os();
    expect(os).toBeDefined();
    expect(os.getBaseUrl()).toBe('http://localhost:9091/v1/api');

    // Verify singleton behavior
    const osAgain = Factory.client.os();
    expect(os).toBe(osAgain);
  });

  it('should provide singleton TickerClient', () => {
    const ticker = Factory.client.ticker();
    expect(ticker).toBeDefined();
    expect(ticker.getBaseUrl()).toBe('http://localhost:9091/v1/api');

    // Verify singleton behavior
    const tickerAgain = Factory.client.ticker();
    expect(ticker).toBe(tickerAgain);
  });
});
