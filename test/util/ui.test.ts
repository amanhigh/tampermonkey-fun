import { UIUtil } from '../../src/util/ui';
import { BarId } from '../../src/models/bar';

// ── Local jQuery mock ──

const jqMock = {
  attr: jest.fn().mockReturnThis(),
  addClass: jest.fn().mockReturnThis(),
  css: jest.fn().mockReturnThis(),
};

const mockDollar = jest.fn(() => jqMock);

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as { $?: typeof mockDollar }).$ = mockDollar;
});

afterEach(() => {
  delete (globalThis as { $?: typeof mockDollar }).$;
});

// ── Tests ──

describe('UIUtil.buildBar', () => {
  const util = new UIUtil();

  test('creates a <div> element via $(\'<div>\')', () => {
    util.buildBar(BarId.ALERT);

    expect(mockDollar).toHaveBeenCalledWith('<div>');
  });

  test('sets the ID to BarId.ALERT (aman-alert-ticker-bar)', () => {
    util.buildBar(BarId.ALERT);

    expect(jqMock.attr).toHaveBeenCalledWith({ id: BarId.ALERT });
  });

  test('adds the BarId value as the BEM block class', () => {
    util.buildBar(BarId.ALERT);

    expect(jqMock.addClass).toHaveBeenCalledWith(BarId.ALERT);
  });

  test('does not apply any inline width or style (no css() call)', () => {
    util.buildBar(BarId.ALERT);

    expect(jqMock.css).not.toHaveBeenCalled();
  });
});
