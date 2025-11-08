export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AuditStatus = 'PASS' | 'FAIL';

export interface AuditResult {
  pluginId: string;
  code: string;
  target: string; // e.g., investingTicker
  message: string;
  severity: AuditSeverity;
  status: AuditStatus; // Explicit pass/fail for each target
}

export interface IAudit {
  readonly id: string; // unique id: 'alerts'
  readonly title: string; // human readable name

  // Validate plugin invariants (e.g., non-empty id/title)
  validate(): void;

  // Runs audit and returns results synchronously
  run(): AuditResult[];
}
