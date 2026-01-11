/**
 * Type-safe audit plugin and section ID constants
 * Plugins and sections share IDs when they're related (e.g., GTT plugin with GTT section)
 * Used to prevent typos and enable compile-time checking of references
 */
export const AUDIT_IDS = {
  /** Alerts audit plugin - analyzes trading alerts */
  ALERTS: 'alerts',

  /** Orphan alerts audit plugin - identifies alerts without corresponding pairs */
  ORPHAN_ALERTS: 'orphan-alerts',

  /** Unmapped pairs audit plugin - identifies pairs without TradingView mappings */
  UNMAPPED_PAIRS: 'unmapped-pairs',

  /** GTT unwatched audit plugin & section - identifies and displays unwatched GTT orders */
  GTT_UNWATCHED: 'gtt-unwatched',

  /** TV mapping audit plugin - analyzes TradingView to Kite symbol mappings */
  TV_MAPPING: 'tv-mapping',
} as const;

/**
 * Type for audit plugin IDs - ensures only valid IDs can be used
 * Example: type PluginId = typeof AUDIT_IDS[keyof typeof AUDIT_IDS];
 */
export type AuditId = (typeof AUDIT_IDS)[keyof typeof AUDIT_IDS];
