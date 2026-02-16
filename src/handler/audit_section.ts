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
  description?: string; // Tooltip shown on header hover
  order: number; // Execution order (lower = earlier, 0 for special handling)

  // Action labels for button tooltips
  leftActionLabel?: string; // Label for left-click action (e.g., "Open")
  rightActionLabel?: string; // Label for right-click action (e.g., "Delete")

  // Data source
  // TODO: Make Plugin Private ?
  plugin: IAudit; // Audit plugin to run

  // Presentation
  headerFormatter: (results: AuditResult[], context?: unknown) => string; // Custom header HTML
  buttonColorMapper: (result: AuditResult, context?: unknown) => string; // Maps result to button color (required)

  // Interaction handlers
  // FIXME: Standardize to use Promise<void> ?
  onLeftClick: (result: AuditResult) => void | Promise<void>; // Primary action (e.g., open in TV)
  onRightClick: (result: AuditResult) => boolean | void | Promise<boolean | void>; // Secondary action — return false to cancel button removal
  onMiddleClick?: (result: AuditResult) => void | Promise<void>; // Optional middle-click action
  onFixAll?: (results: AuditResult[]) => void | Promise<void>; // Optional bulk-action handler for "Fix All" workflow

  // Display options
  limit?: number; // Items per page (0 or undefined = no pagination)
  context?: unknown; // Additional context data (e.g., total count for header)
}
