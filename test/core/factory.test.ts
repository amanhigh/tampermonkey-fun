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
