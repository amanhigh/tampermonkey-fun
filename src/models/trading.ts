/**
 * Represents a trading timeframe configuration
 *
 * A TimeFrame is a specific time period view (like Daily, Weekly, Monthly) used in trading charts.
 * Each timeframe has:
 * - A short symbol for display (e.g., "D" for Daily)
 * - A style identifier used for applying visual styles to chart elements
 * - A toolbar position that indicates which toolbar button corresponds to this timeframe
 *
 * TimeFrames are organized in sequences (MWD/YR) where each sequence defines an ordered set
 * of timeframes suitable for different trading strategies:
 * - MWD (Monthly-Weekly-Daily): Used for regular trading analysis
 * - YR (Yearly): Used for longer-term analysis
 */
export class TimeFrame {
  private _symbol: string;
  private _style: string;
  private _toolbar: number;

  constructor(symbol: string, style: string, toolbarPosition: number) {
    this._symbol = symbol;
    this._style = style;
    this._toolbar = toolbarPosition;
  }

  get symbol(): string {
    return this._symbol;
  }
  get style(): string {
    return this._style;
  }
  get toolbar(): number {
    return this._toolbar;
  }

  set symbol(value: string) {
    this._symbol = value;
  }
  set style(value: string) {
    this._style = value;
  }
  set toolbar(value: number) {
    this._toolbar = value;
  }
}
