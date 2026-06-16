import { ITimeFrameManager } from '../manager/timeframe';
import { TimeFrameCode, DISPLAY_TIMEFRAMES } from '../models/timeframe';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';

// ── CSS class names (defined in _timeframe_bar.less) ──

const TF = Constants.UI.IDS.TIMEFRAME_BAR;

// ── Emoji constants ──

const EMOJI_TIMEFRAMES = '🧭';

/**
 * Tooltip text shown when hovering over a timeframe chip.
 * Explains the recommended timeframe toggle purpose.
 */
const TOOLTIP_TEXT = 'Recommended timeframe for this ticker. Click to add/remove.';

/**
 * Interface for timeframe bar operations.
 * Renders clickable timeframe chips and handles toggle interactions.
 */
export interface ITimeframeBarHandler {
  /**
   * Fetches current backend ticker timeframes and re-renders the bar.
   * All six chips (YR → DL) are shown; active ones are highlighted, inactive are muted.
   */
  render(): Promise<void>;
}

/**
 * Handles the timeframe bar UI below the display card.
 *
 * Shows all six possible timeframe codes as clickable chips.
 * Active chips (those in the backend ticker.timeframes) are colored;
 * inactive chips are muted. Clicking toggles the code on/off in the backend.
 */
export class TimeframeBarHandler implements ITimeframeBarHandler {
  // Prevents concurrent toggle operations
  private toggling = false;

  constructor(private readonly timeFrameManager: ITimeFrameManager) {}

  /** @inheritdoc */
  async render(): Promise<void> {
    const $bar = $(`#${TF.CONTAINER}`);
    if ($bar.length === 0) {
      return;
    }

    let activeCodes: TimeFrameCode[];
    try {
      activeCodes = await this.timeFrameManager.getExactTimeframesForCurrentTicker();
    } catch {
      activeCodes = [];
    }

    const activeSet = new Set(activeCodes);
    const chipsHtml = DISPLAY_TIMEFRAMES.map((code) => {
      const isActive = activeSet.has(code);
      const cls = `${TF.CHIP_CLASS} ${isActive ? TF.ACTIVE_CLASS : TF.INACTIVE_CLASS}`;
      return `<span class="${cls}" ${TF.ATTR_CODE}="${code}" title="${TOOLTIP_TEXT}">${code}</span>`;
    }).join('');

    $bar.html(`${EMOJI_TIMEFRAMES} ${chipsHtml}`);

    // Delegate click handler — off/on to avoid duplicates.
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $bar.off('click', `.${TF.CHIP_CLASS}`).on('click', `.${TF.CHIP_CLASS}`, (e) => {
      e.stopPropagation();
      void this.handleChipClick($(e.currentTarget));
    });
  }

  /**
   * Handles click on a timeframe chip.
   * Toggles the timeframe code in the backend via TimeFrameManager,
   * then re-renders the bar on success or failure.
   * @param $chip - The clicked chip element
   */
  private async handleChipClick($chip: JQuery): Promise<void> {
    if (this.toggling) {
      return;
    }
    this.toggling = true;

    const code = $chip.attr(TF.ATTR_CODE) as TimeFrameCode | undefined;
    if (!code) {
      this.toggling = false;
      return;
    }

    // Add loading state
    $chip.addClass(TF.LOADING_CLASS);

    try {
      await this.timeFrameManager.toggleTimeframeForCurrentTicker(code);
      // Re-render with fresh backend state
      await this.render();
    } catch (error) {
      Notifier.warn(`Failed to toggle timeframe ${code}: ${(error as Error).message}`);
      // Re-render to restore actual backend state
      await this.render();
    } finally {
      this.toggling = false;
    }
  }
}
