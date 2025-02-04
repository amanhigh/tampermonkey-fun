declare module '*.less';

/**
 * TamperMonkey value change listener
 * Note: Declaration needed for TypeScript compilation
 * as function exists in runtime but not in @types/greasemonkey
 */
declare function GM_addValueChangeListener(
  key: string,
  callback: (key: string, oldValue: unknown, newValue: unknown, remote: boolean) => void
): number;
