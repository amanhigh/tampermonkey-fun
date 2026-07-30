import { AuditRenderer } from '../../src/util/audit_renderer';
import { IAuditSection } from '../../src/handler/audit_section';
import { AuditResult } from '../../src/models/audit';
import { IUIUtil } from '../../src/util/ui';

interface MockJQuery {
  addClass: jest.Mock;
  appendTo: jest.Mock;
  attr: jest.Mock;
  css: jest.Mock;
  hide: jest.Mock;
  html: jest.Mock;
  on: jest.Mock;
  prop: jest.Mock;
  remove: jest.Mock;
}

const createMockJQuery = (): MockJQuery => {
  const mock: Partial<MockJQuery> = {};
  mock.addClass = jest.fn().mockReturnValue(mock);
  mock.appendTo = jest.fn().mockReturnValue(mock);
  mock.attr = jest.fn().mockReturnValue(mock);
  mock.css = jest.fn().mockReturnValue(mock);
  mock.hide = jest.fn().mockReturnValue(mock);
  mock.html = jest.fn().mockReturnValue(mock);
  mock.on = jest.fn().mockReturnValue(mock);
  mock.prop = jest.fn().mockReturnValue(mock);
  mock.remove = jest.fn().mockReturnValue(mock);
  return mock as MockJQuery;
};

describe('AuditRenderer', () => {
  let section: IAuditSection;
  let button: MockJQuery;
  let dollar: jest.Mock;
  const result: AuditResult = { code: 'TEST', target: 'SBIN', severity: 'HIGH' };

  beforeEach(() => {
    button = createMockJQuery();
    const elements = new Map<string, MockJQuery>();
    dollar = jest.fn((selector: string) => {
      if (selector === '<div>') {
        return createMockJQuery();
      }

      const existing = elements.get(selector) ?? createMockJQuery();
      elements.set(selector, existing);
      return existing;
    });
    (globalThis as { $?: typeof dollar }).$ = dollar;

    section = {
      id: 'test',
      title: 'Test',
      order: 1,
      plugin: {
        id: 'test',
        title: 'Test',
        validate: jest.fn(),
        run: jest.fn().mockResolvedValue([]),
      },
      headerFormatter: jest.fn().mockReturnValue('Header'),
      buttonColorMapper: jest.fn().mockReturnValue('blue'),
      onLeftClick: jest.fn().mockResolvedValue(undefined),
      onRightClick: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    delete (globalThis as { $?: typeof dollar }).$;
  });

  const renderResult = (rightClickResult: boolean): AuditRenderer => {
    section.onRightClick = jest.fn().mockResolvedValue(rightClickResult);
    const uiUtil = {
      buildButton: jest.fn().mockImplementation(() => button),
    } as unknown as IUIUtil;
    const renderer = new AuditRenderer(section, uiUtil, createMockJQuery() as unknown as JQuery);
    renderer.setResults([result]);
    renderer.render();

    const contextMenuHandler = button.on.mock.calls.find(([eventName]) => eventName === 'contextmenu')[1];
    void contextMenuHandler({ preventDefault: jest.fn() });
    return renderer;
  };

  test('removes a result and its button after a successful async right-click', async () => {
    const renderer = renderResult(true);

    await Promise.resolve();

    expect(button.remove).toHaveBeenCalled();
    expect(renderer.getResults()).toEqual([]);
  });

  test('retains a result and its button when async right-click returns false', async () => {
    const renderer = renderResult(false);

    await Promise.resolve();

    expect(button.remove).not.toHaveBeenCalled();
    expect(renderer.getResults()).toEqual([result]);
  });
});
