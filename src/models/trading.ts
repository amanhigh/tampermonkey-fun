/**
 * Available trend types for journal entries
 */
export enum Trend {
  /** Normal trend movement */
  TREND = 'trend',
  /** Counter trend movement */
  COUNTER_TREND = 'ctrend',
}

/**
 * Available journal entry types
 **/
export enum JournalType {
  SET = 'set',
  RESULT = 'result',
  REJECTED = 'rejected',
}
