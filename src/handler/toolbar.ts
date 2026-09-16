import { IDomManager } from '../manager/dom';
import { Constants } from '../models/constant';
import { IUIUtil } from '../util/ui';
import { IAlertHandler } from './alert';
import { IJournalHandler } from './journal';
import { IPanelHandler } from './panel';
import { ITickerHandler } from './ticker';

export interface IToolbarHandler {
  /**
   * Builds the TradingView top action toolbar into the mounted `#aman-area` root.
   * Must be invoked after the main area is appended to the DOM.
   */
  render(): void;
}

/**
 * Builds the TradingView top action toolbar and wires its user interactions.
 */
export class ToolbarHandler implements IToolbarHandler {
  constructor(
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly alertHandler: IAlertHandler,
    private readonly panelHandler: IPanelHandler,
    private readonly journalHandler: IJournalHandler,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  public render(): void {
    const $area = $(`#${Constants.UI.IDS.AREAS.MAIN}`);
    const $topWrapper = this.uiUtil
      .buildWrapper(Constants.UI.IDS.AREAS.TOP, Constants.UI.POSITIONS.WRAPPER_WIDTH)
      .appendTo($area);

    $topWrapper
      .append(this.buildSwiftCheckbox())
      .append(this.buildSequenceButton())
      .append(this.buildAlertButton())
      .append(this.buildRefreshButton())
      .append(this.buildJournalButton());
  }

  private buildSwiftCheckbox(): JQuery {
    return this.uiUtil.buildCheckBox(Constants.UI.IDS.CHECKBOXES.SWIFT, false);
  }

  private buildSequenceButton(): JQuery {
    return this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.SEQUENCE, 'S', () => {
        void this.tickerHandler.startTracking();
      })
      .on('contextmenu', (e) => {
        e.preventDefault();
        void this.tickerHandler.stopTracking(this.domManager.getTicker());
      });
  }

  private buildAlertButton(): JQuery {
    return this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.ALERT_CREATE, 'A')
      .on('click', (e) => this.alertHandler.handleAlertButton(e.originalEvent as MouseEvent))
      .on('contextmenu', (e) => {
        this.alertHandler.handleAlertContextMenu(e.originalEvent as MouseEvent);
      });
  }

  private buildRefreshButton(): JQuery {
    return this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.REFRESH, 'R', () => this.alertHandler.handleRefreshButton())
      .on('contextmenu', (e) => {
        e.preventDefault();
        void this.panelHandler.showPanel();
      });
  }

  private buildJournalButton(): JQuery {
    return this.uiUtil
      .buildButton(Constants.UI.IDS.BUTTONS.JOURNAL, 'J', () => {
        this.journalHandler.handleJournalButton();
      })
      .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
        e.preventDefault();
        const auditAreaId = `#${Constants.UI.IDS.AREAS.AUDIT}`;
        // Toggle audit area visibility (audit data loaded via FIRST_LOAD event)
        this.uiUtil.toggleUI(auditAreaId);
      });
  }
}
