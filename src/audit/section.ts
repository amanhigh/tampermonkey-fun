import { IAudit, AuditResult } from '../models/audit';

/**
 * Specification for an audit section
 * Defines both static properties and interactive handlers for rendering audit results
 *
 * @example
 * ```typescript
 * const gttSection: IAuditSection = {
 *   id: 'gtt-unwatched',
 *   title: 'GTT Orders',
 *   plugin: gttUnwatchedPlugin,
 *   headerFormatter: (results, total) => `${results.length} unwatched of ${total}`,
 *   buttonColor: 'gold',
 *   onLeftClick: (ticker) => openInTradingView(ticker),
 *   onRightClick: (ticker) => addToWatchlist(ticker),
 *   limit: 10,
 *   context: totalOrders,
 * };
 *
 * const renderer = new AuditRenderer(gttSection, uiUtil, $container);
 * renderer.render();
 * ```
 */
export interface IAuditSection {
  // Identity
  id: string; // Unique section identifier
  title: string; // Display title

  // Data source
  // HACK: Make Plugin Private ?
  plugin: IAudit; // Audit plugin to run

  // FIXME: Collapse Section If Everything Okay by default
  // Presentation
  headerFormatter: (results: AuditResult[], context?: unknown) => string; // Custom header HTML
  buttonColorMapper: (result: AuditResult, context?: unknown) => string; // Maps result to button color (required)

  // Interaction handlers
  onLeftClick: (result: AuditResult) => void | Promise<void>; // Primary action (e.g., open in TV)
  onRightClick: (result: AuditResult) => void | Promise<void>; // Secondary action (e.g., add to watchlist)
  onMiddleClick?: (result: AuditResult) => void | Promise<void>; // Optional middle-click action

  // Display options
  limit?: number; // Items per page (0 or undefined = no pagination)
  context?: unknown; // Additional context data (e.g., total count for header)
}
