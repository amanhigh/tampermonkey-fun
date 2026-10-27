import { ISeerManager } from '../manager/seer';
import { Constants } from '../models/constant';
import { escapeHtml } from '../util/html';
import { Notifier } from '../util/notify';

/**
 * ISeerHandler owns the Seer deletion panel.
 */
export interface ISeerHandler {
  /** Mount the Delete button once and keep it visible only on detail routes. */
  initialize(): void;
}

/**
 * SeerHandler renders a single Delete button, keeps its visibility in sync with
 * the live route and runs one confirmed files → requests → media deletion.
 */
export class SeerHandler implements ISeerHandler {
  private started = false;
  private busy = false;
  private gone = false;

  constructor(private readonly manager: ISeerManager) {}

  /** @inheritdoc */
  initialize(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.renderPanel();
    this.syncVisibility();
    const timer = setInterval(this.syncVisibility, VISIBILITY_POLL_MS);
    window.addEventListener(
      'pagehide',
      () => {
        this.gone = true;
        clearInterval(timer);
        document.getElementById(Constants.UI.IDS.SEER.PANEL)?.remove();
      },
      { once: true }
    );
  }

  /** Show the panel only while the live route is a Seer detail page. */
  private readonly syncVisibility = (): void => {
    const panel = document.getElementById(Constants.UI.IDS.SEER.PANEL);
    if (panel) {
      panel.hidden = !this.manager.isDetailPage(window.location.pathname);
    }
  };

  /** Click handler for the Delete button. */
  private readonly handleDeleteClick = (): void => {
    void this.runDelete();
  };

  /** Confirm the irreversible deletion of the live route, then run it once. */
  private async runDelete(): Promise<void> {
    if (this.busy) {
      return;
    }
    const pathname = window.location.pathname;
    if (!this.manager.isDetailPage(pathname)) {
      return;
    }
    if (!confirm(DELETE_WARNING)) {
      return;
    }

    this.busy = true;
    this.updateButton(DELETING_LABEL, true);
    try {
      await this.manager.deleteMedia(pathname);
      if (this.reportFinished(pathname)) {
        await delay(REFRESH_DELAY_MS);
        this.reloadFinishedRoute(pathname);
      }
    } catch (error) {
      this.reportFailure(pathname, error);
    } finally {
      this.busy = false;
      this.updateButton(DELETE_LABEL, false);
    }
  }

  /**
   * Report the completed deletion of the captured route and schedule a refresh
   * only while the live route is still that route.
   */
  private reportFinished(pathname: string): boolean {
    if (this.gone) {
      return false;
    }
    const sameRoute = window.location.pathname === pathname;
    Notifier.success(
      escapeHtml(`Seer deletion finished for ${pathname}.${sameRoute ? ' The page will refresh.' : ''}`)
    );
    return sameRoute;
  }

  /** Reload the captured route only while it is still live and the page did not exit. */
  private reloadFinishedRoute(pathname: string): void {
    if (this.gone || window.location.pathname !== pathname) {
      return;
    }
    window.location.reload();
  }

  /** Report a failed deletion without refreshing. */
  private reportFailure(pathname: string, error: unknown): void {
    if (this.gone) {
      return;
    }
    Notifier.error(escapeHtml(`Seer deletion failed for ${pathname}: ${toMessage(error)}`), FAILURE_TIMEOUT_MS);
  }

  /** Update the mounted button label and state when it exists. */
  private updateButton(label: string, disabled: boolean): void {
    const button = document.getElementById(Constants.UI.IDS.SEER.DELETE_BUTTON);
    if (button instanceof HTMLButtonElement) {
      button.disabled = disabled;
      button.textContent = label;
    }
  }

  /** Insert the scoped deletion panel exactly once. */
  private renderPanel(): void {
    if (document.getElementById(Constants.UI.IDS.SEER.PANEL)) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = Constants.UI.IDS.SEER.PANEL;
    panel.className = 'seer-panel';

    const button = document.createElement('button');
    button.id = Constants.UI.IDS.SEER.DELETE_BUTTON;
    button.className = 'seer-panel__delete';
    button.type = 'button';
    button.textContent = DELETE_LABEL;
    button.addEventListener('click', this.handleDeleteClick);

    panel.appendChild(button);
    document.body.appendChild(panel);
  }
}

/** Poll interval for keeping the panel in sync with the live route. */
const VISIBILITY_POLL_MS = 400;

/** Delay between the success notification and the automatic refresh of the route. */
const REFRESH_DELAY_MS = 2000;

/** Display duration of the failure notification in milliseconds. */
const FAILURE_TIMEOUT_MS = 8000;

/** Idle label of the deletion button. */
const DELETE_LABEL = 'Delete';

/** Label shown while the confirmed deletion runs. */
const DELETING_LABEL = 'Deleting…';

/** Irreversible library deletion warning shown before any request is made. */
const DELETE_WARNING =
  'Delete this media? Its library files, requests and media entry are removed ' + 'permanently. This cannot be undone.';

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Resolve after the given delay so the pending refresh can be awaited. */
async function delay(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
