import { ToolbarHandler } from '../../src/handler/toolbar';
import { IUIUtil } from '../../src/util/ui';
import { ITickerHandler } from '../../src/handler/ticker';
import { IAlertHandler } from '../../src/handler/alert';
import { IPanelHandler } from '../../src/handler/panel';
import { IJournalHandler } from '../../src/handler/journal';
import { IDomManager } from '../../src/manager/dom';
import { Constants } from '../../src/models/constant';

const mockJQuery = {
  append: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  change: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
} as any;

(global as any).$ = jest.fn(() => mockJQuery);

describe('ToolbarHandler', () => {
  let toolbarHandler: ToolbarHandler;
  let mockUiUtil: jest.Mocked<IUIUtil>;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockAlertHandler: jest.Mocked<IAlertHandler>;
  let mockPanelHandler: jest.Mocked<IPanelHandler>;
  let mockJournalHandler: jest.Mocked<IJournalHandler>;
  let mockDomManager: jest.Mocked<IDomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockJQuery).forEach((fn: any) => fn.mockReturnThis?.());

    mockUiUtil = {
      buildWrapper: jest.fn().mockReturnValue(mockJQuery),
      buildCheckBox: jest.fn().mockReturnValue(mockJQuery),
      buildButton: jest.fn().mockReturnValue(mockJQuery),
      toggleUI: jest.fn(),
    } as unknown as jest.Mocked<IUIUtil>;

    mockTickerHandler = {
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITickerHandler>;

    mockAlertHandler = {
      handleAlertButton: jest.fn(),
      handleAlertContextMenu: jest.fn(),
      handleRefreshButton: jest.fn(),
    } as unknown as jest.Mocked<IAlertHandler>;

    mockPanelHandler = {
      showPanel: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPanelHandler>;

    mockJournalHandler = {
      handleJournalButton: jest.fn(),
    } as unknown as jest.Mocked<IJournalHandler>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('TCS'),
    } as unknown as jest.Mocked<IDomManager>;

    toolbarHandler = new ToolbarHandler(
      mockUiUtil,
      mockTickerHandler,
      mockAlertHandler,
      mockPanelHandler,
      mockJournalHandler,
      mockDomManager
    );
  });

  function getButtonHandler(id: string): () => void {
    const buttonCall = mockUiUtil.buildButton.mock.calls.find((call) => call[0] === id);
    return buttonCall?.[2] as () => void;
  }

  function getContextMenuHandlers(): ((event: JQuery.Event) => void)[] {
    return mockJQuery.on.mock.calls
      .filter(([eventName]: [string]) => eventName === 'contextmenu')
      .map(([, handler]: [string, (event: JQuery.Event) => void]) => handler);
  }

  describe('render', () => {
    it('builds the top toolbar controls without attaching a swift checkbox change handler', () => {
      toolbarHandler.render();

      expect(mockUiUtil.buildWrapper).toHaveBeenCalledWith(Constants.UI.IDS.AREAS.TOP, Constants.UI.POSITIONS.WRAPPER_WIDTH);
      expect(mockUiUtil.buildCheckBox).toHaveBeenCalledWith(Constants.UI.IDS.CHECKBOXES.SWIFT, false);
      expect(mockUiUtil.buildButton).toHaveBeenCalledTimes(4);
      expect(mockUiUtil.buildButton).toHaveBeenNthCalledWith(
        1,
        Constants.UI.IDS.BUTTONS.SEQUENCE,
        'S',
        expect.any(Function)
      );
      expect(mockUiUtil.buildButton).toHaveBeenNthCalledWith(2, Constants.UI.IDS.BUTTONS.ALERT_CREATE, 'A');
      expect(mockUiUtil.buildButton).toHaveBeenNthCalledWith(
        3,
        Constants.UI.IDS.BUTTONS.REFRESH,
        'R',
        expect.any(Function)
      );
      expect(mockUiUtil.buildButton).toHaveBeenNthCalledWith(
        4,
        Constants.UI.IDS.BUTTONS.JOURNAL,
        'J',
        expect.any(Function)
      );
      expect(mockJQuery.change).not.toHaveBeenCalled();
    });

    it('starts tracking when the S button is clicked', () => {
      toolbarHandler.render();

      getButtonHandler(Constants.UI.IDS.BUTTONS.SEQUENCE)();

      expect(mockTickerHandler.startTracking).toHaveBeenCalledTimes(1);
    });

    it('stops tracking the current ticker from the S button context menu', () => {
      toolbarHandler.render();
      const event = { preventDefault: jest.fn() } as unknown as JQuery.Event;

      getContextMenuHandlers()[0](event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockDomManager.getTicker).toHaveBeenCalledTimes(1);
      expect(mockTickerHandler.stopTracking).toHaveBeenCalledWith('TCS');
    });

    it('delegates A button click and context menu actions', () => {
      toolbarHandler.render();
      const event = { preventDefault: jest.fn() } as unknown as JQuery.Event;
      const clickHandler = mockJQuery.on.mock.calls.find(([eventName]: [string]) => eventName === 'click')?.[1] as (
        event: JQuery.Event
      ) => void;

      clickHandler(event);
      getContextMenuHandlers()[1](event);

      expect(mockAlertHandler.handleAlertButton).toHaveBeenCalledTimes(1);
      expect(mockAlertHandler.handleAlertContextMenu).toHaveBeenCalledTimes(1);
    });

    it('delegates R button click and opens the panel from its context menu', () => {
      toolbarHandler.render();
      const event = { preventDefault: jest.fn() } as unknown as JQuery.Event;

      getButtonHandler(Constants.UI.IDS.BUTTONS.REFRESH)();
      getContextMenuHandlers()[2](event);

      expect(mockAlertHandler.handleRefreshButton).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockPanelHandler.showPanel).toHaveBeenCalledTimes(1);
    });

    it('delegates J button click and toggles the audit area from its context menu', () => {
      toolbarHandler.render();
      const event = { preventDefault: jest.fn() } as unknown as JQuery.Event;

      getButtonHandler(Constants.UI.IDS.BUTTONS.JOURNAL)();
      getContextMenuHandlers()[3](event);

      expect(mockJournalHandler.handleJournalButton).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockUiUtil.toggleUI).toHaveBeenCalledWith(`#${Constants.UI.IDS.AREAS.AUDIT}`);
    });
  });
});
