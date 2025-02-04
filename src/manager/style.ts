import { Constants } from '../models/constant';
import { WaitUtil } from '../util/wait';
import { ITimeFrameManager } from './timeframe';

/**
 * Interface for managing TradingView styles and toolbar operations
 */
export interface IStyleManager {
  /**
   * Selects a toolbar item by index
   * @param index - The toolbar index (0-based)
   * @returns True if selection was successful
   */
  selectToolbar(index: number): void;

  /**
   * Applies zone style based on timeframe and zone type
   * @param zoneType Zone type constants from TRADING.ZONES
   * @returns True if style was applied
   */
  applyZoneStyle(zoneType: string): void;

  /**
   * Applies named style using trading view selectors
   * @param styleName Name of style to apply
   * @returns True if style was applied
   */
  applyStyle(styleName: string): void;

  /**
   * Function to clear all items.
   */
  clearAll(): void;
}

/**
 * Manages TradingView style and toolbar operations
 */
export class StyleManager implements IStyleManager {
  /**
   * @param waitUtil Manager for DOM operations
   * @param timeFrameManager Timeframe operations manager
   */
  constructor(
    private readonly waitUtil: WaitUtil,
    private readonly timeFrameManager: ITimeFrameManager
  ) {}

  /** @inheritdoc */
  selectToolbar(index: number): void {
    // Validate index range
    if (index < 0 || index > 10) {
      throw new Error(`Invalid toolbar index: ${index}`);
    }

    const toolbar = $(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
    if (toolbar.length === 0) {
      throw new Error(`Toolbar with index ${index} not found`);
    }

    toolbar.click();
  }

  /** @inheritdoc */
  applyZoneStyle(zoneType: string): void {
    const currentTimeFrame = this.timeFrameManager.getCurrentTimeFrameConfig();

    // Get style ID (e.g. 'I', 'H', 'VH') from timeframe config
    const styleId = currentTimeFrame.style;

    // Combine style with zone (e.g. 'IDZ', 'HDZ', 'VHDZ')
    const styleName = styleId + zoneType;

    return this.applyStyle(styleName);
  }

  /** @inheritdoc */
  applyStyle(styleName: string): void {
    // Select style toolbar
    this.waitUtil.waitJClick(Constants.DOM.TOOLBARS.STYLE, () => {
      // Select specific style by name
      this.waitUtil.waitJClick(`${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${styleName})`);
    });
  }

  /** @inheritdoc */
  clearAll(): void {
    this.waitUtil.waitJClick(Constants.DOM.SIDEBAR.DELETE_ARROW, () => {
      this.waitUtil.waitJClick(Constants.DOM.SIDEBAR.DELETE_DRAWING);
    });
  }
}
