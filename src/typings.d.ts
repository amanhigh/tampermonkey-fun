declare module '*.less';

/**
 * Options accepted by Tampermonkey's GM.openInTab.
 * Note: Declaration needed for TypeScript compilation as the installed
 * @types/greasemonkey only declares the legacy boolean background flag.
 */
interface GMOpenInTabOptions {
  /** Focus the new tab instead of leaving it in the background. */
  active?: boolean;
  /** Open the tab next to the current one. */
  insert?: boolean;
  /** Keep the current page as the parent of the new tab. */
  setParent?: boolean;
}

/** Handle of a tab opened by GM.openInTab. */
interface GMOpenInTabHandle {
  /** Close the opened tab. */
  close(): void;
  /** Whether the opened tab is already closed. */
  readonly closed: boolean;
}

/**
 * Tampermonkey GM.openInTab: opens a url with options and resolves with the tab handle.
 * Note: Declared separately as a variable's method cannot be augmented in place.
 */
type GMOpenInTab = (url: string, options?: GMOpenInTabOptions) => Promise<GMOpenInTabHandle>;

/**
 * TamperMonkey value change listener
 * Note: Declaration needed for TypeScript compilation
 * as function exists in runtime but not in @types/greasemonkey
 */
declare function GM_addValueChangeListener(
  key: string,
  callback: (key: string, oldValue: unknown, newValue: unknown, remote: boolean) => void
): number;
