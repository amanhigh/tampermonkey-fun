// ── Audit Catalogue Types ──
// These types mirror the backend audit API DTOs in go-fun/models/barkat/audit.go.
// They are distinct from the frontend audit plugin models in audit.ts.

import { KohanEnvelope, PaginationMetadata } from './api';

/** Severity levels for audit findings. */
export type AuditFindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/** One active audit check returned by the catalogue endpoint. */
export interface AuditItem {
  id: string;
  title: string;
  description: string;
  order: number;
}

/** Catalogue response body from GET /v1/api/audits. */
export interface AuditCatalog {
  audits: AuditItem[];
}

/** One operator-facing audit finding within an execution result. */
export interface AuditFinding {
  code: string;
  target: string;
  severity: AuditFindingSeverity;
  data?: Record<string, string>;
}

/** Result body from GET /v1/api/audits/{audit-id}/results. */
export interface AuditExecutionResult {
  audit_id: string;
  generated_at: string;
  counts: Record<string, number>;
  findings: AuditFinding[];
  metadata: PaginationMetadata;
}

/** Envelope type for audit execution response. */
export type AuditExecutionEnvelope = KohanEnvelope<AuditExecutionResult>;
