/**
 * Available sequence types for timeframe analysis
 */
export enum SequenceType {
  /** Monthly-Weekly-Daily sequence for regular trading */
  MWD = 'MWD',
  /** Yearly sequence for longer-term analysis */
  YR = 'YR',
}

/**
 * Available timeframe keys
 */
export enum TimeFrame {
  /** Daily timeframe */
  DAILY = 'DAILY',
  /** Weekly timeframe */
  WEEKLY = 'WEEKLY',
  /** Monthly timeframe */
  MONTHLY = 'MONTHLY',
  /** Three month timeframe */
  THREE_MONTHLY = 'THREE_MONTHLY',
  /** Six month timeframe */
  SIX_MONTHLY = 'SIX_MONTHLY',
}

/**
 * Mapping of sequence types to ordered timeframe keys
 */
export interface SequenceMap {
  [SequenceType.MWD]: TimeFrame[];
  [SequenceType.YR]: TimeFrame[];
}

/**
 * Timeframe configuration mapping
 */
export type TimeFrameMap = Record<TimeFrame, TimeFrameConfig>;

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
export class TimeFrameConfig {
  constructor(
    private _symbol: string,
    private _style: string,
    private _toolbar: number
  ) {}

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
