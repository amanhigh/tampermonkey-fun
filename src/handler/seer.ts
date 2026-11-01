import { ISearchManager } from '../manager/search';
import { ISeerManager } from '../manager/seer';
import { Constants } from '../models/shared/constant';
import { escapeHtml } from '../util/html';
import { Notifier } from '../util/notify';

/**
 * ISeerHandler owns the Seer sidekick panel.
 */
export interface ISeerHandler {
  /** Mount the Search and Delete buttons once and keep them visible only on detail routes. */
  initialize(): void;
}

/**
 * SeerHandler renders the Xstream search and Delete buttons, keeps their
 * visibility in sync with the live route, opens one Airtel Xstream search tab
 * and runs one confirmed files → requests → media deletion.
 */
export class SeerHandler implements ISeerHandler {
  private started = false;
  private busy = false;
  private xstreamBusy = false;
  private gone = false;
  private observedPath: string | null = null;
  private generation = 0;
  private eligible = false;

  constructor(
    private readonly manager: ISeerManager,
    private readonly search: ISearchManager
  ) {}

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
        this.generation += 1;
        clearInterval(timer);
        document.getElementById(Constants.UI.IDS.SEER.PANEL)?.remove();
      },
      { once: true }
    );
  }

  /**
   * Show the panel only while the live route is a Seer detail page and verify
   * its media record once per route entry, discarding results of older entries.
   */
  private readonly syncVisibility = (): void => {
    if (this.gone) {
      return;
    }
    const pathname = window.location.pathname;
    const supported = this.manager.isDetailPage(pathname);
    const panel = document.getElementById(Constants.UI.IDS.SEER.PANEL);
    if (panel) {
      panel.hidden = !supported;
    }
    if (pathname === this.observedPath) {
      return;
    }
    this.observedPath = pathname;
    this.generation += 1;
    this.setEligible(false);
    if (supported) {
      void this.checkPresence(pathname, this.generation);
    }
  };

  /** Verify the media record of one route entry, ignoring results of older entries. */
  private async checkPresence(pathname: string, generation: number): Promise<void> {
    try {
      const present = await this.manager.hasMediaRecord(pathname);
      if (this.isCurrentRoute(pathname, generation)) {
        this.setEligible(present);
      }
    } catch (error) {
      if (!this.isCurrentRoute(pathname, generation)) {
        return;
      }
      this.setEligible(false);
      Notifier.error(escapeHtml(`Seer media lookup failed for ${pathname}: ${toMessage(error)}`), FAILURE_TIMEOUT_MS);
    }
  }

  /** Report whether a pending result still belongs to the live route entry of this page. */
  private isCurrentRoute(pathname: string, generation: number): boolean {
    return !this.gone && this.generation === generation && window.location.pathname === pathname;
  }

  /** Report whether the live path is still the verified route entry of the page. */
  private canDeleteLive(pathname: string): boolean {
    return this.eligible && pathname === this.observedPath;
  }

  /** Show or hide the Delete button without touching its busy label or state. */
  private setEligible(eligible: boolean): void {
    this.eligible = eligible;
    const button = document.getElementById(Constants.UI.IDS.SEER.DELETE_BUTTON);
    if (button instanceof HTMLButtonElement) {
      button.hidden = !eligible;
    }
  }

  /** Click handler for the Xstream search button. */
  private readonly handleXstreamClick = (): void => {
    void this.runXstream();
  };

  /** Click handler for the Delete button. */
  private readonly handleDeleteClick = (): void => {
    void this.runDelete();
  };

  /** Resolve the search url of the live route, then open it in a foreground tab. */
  private async runXstream(): Promise<void> {
    if (this.xstreamBusy) {
      return;
    }
    const pathname = window.location.pathname;
    if (!this.manager.isDetailPage(pathname)) {
      return;
    }

    this.xstreamBusy = true;
    this.updateButton(Constants.UI.IDS.SEER.XSTREAM_BUTTON, OPENING_LABEL, true);
    try {
      const url = await this.search.getXstreamUrl(pathname);
      if (this.gone || window.location.pathname !== pathname) {
        return;
      }
      await (GM.openInTab as GMOpenInTab)(url, { active: true, setParent: true });
    } catch (error) {
      this.reportXstreamFailure(pathname, error);
    } finally {
      this.xstreamBusy = false;
      this.updateButton(Constants.UI.IDS.SEER.XSTREAM_BUTTON, XSTREAM_LABEL, false);
    }
  }

  /** Report a failed search lookup or tab open, only while the route is still live. */
  private reportXstreamFailure(pathname: string, error: unknown): void {
    if (this.gone || window.location.pathname !== pathname) {
      return;
    }
    Notifier.error(escapeHtml(`Seer Xstream search failed for ${pathname}: ${toMessage(error)}`), FAILURE_TIMEOUT_MS);
  }

  /** Confirm the irreversible deletion of the verified live route, then run it once. */
  private async runDelete(): Promise<void> {
    if (this.busy || this.gone) {
      return;
    }
    const pathname = window.location.pathname;
    if (!this.manager.isDetailPage(pathname)) {
      return;
    }
    if (!this.canDeleteLive(pathname)) {
      return;
    }
    if (!confirm(DELETE_WARNING)) {
      return;
    }

    this.busy = true;
    this.updateButton(Constants.UI.IDS.SEER.DELETE_BUTTON, DELETING_LABEL, true);
    const label = await this.manager.getMediaTitle(pathname).catch(() => pathname);
    try {
      await this.manager.deleteMedia(pathname);
      if (this.reportFinished(pathname, label)) {
        await delay(REFRESH_DELAY_MS);
        this.reloadFinishedRoute(pathname);
      }
    } catch (error) {
      this.reportFailure(label, error);
    } finally {
      this.busy = false;
      this.updateButton(Constants.UI.IDS.SEER.DELETE_BUTTON, DELETE_LABEL, false);
    }
  }

  /**
   * Report the completed deletion of the captured route and schedule a refresh
   * only while the live route is still that route.
   */
  private reportFinished(pathname: string, label: string): boolean {
    if (this.gone) {
      return false;
    }
    const sameRoute = window.location.pathname === pathname;
    Notifier.success(
      escapeHtml(
        `Deleted "${label}". Library files, requests and media entry removed.${sameRoute ? ' The page will refresh.' : ''}`
      )
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
  private reportFailure(label: string, error: unknown): void {
    if (this.gone) {
      return;
    }
    Notifier.error(escapeHtml(`Deletion failed for "${label}": ${toMessage(error)}`), FAILURE_TIMEOUT_MS);
  }

  /** Update the label and state of a mounted panel button when it exists. */
  private updateButton(id: string, label: string, disabled: boolean): void {
    const button = document.getElementById(id);
    if (button instanceof HTMLButtonElement) {
      button.disabled = disabled;
      button.textContent = label;
    }
  }

  /** Insert the scoped sidekick panel exactly once. */
  private renderPanel(): void {
    if (document.getElementById(Constants.UI.IDS.SEER.PANEL)) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = Constants.UI.IDS.SEER.PANEL;
    panel.className = 'seer-panel';
    panel.appendChild(
      this.createButton(
        Constants.UI.IDS.SEER.XSTREAM_BUTTON,
        'seer-panel__xstream',
        XSTREAM_LABEL,
        this.handleXstreamClick
      )
    );
    const deleteButton = this.createButton(
      Constants.UI.IDS.SEER.DELETE_BUTTON,
      'seer-panel__delete',
      DELETE_LABEL,
      this.handleDeleteClick
    );
    deleteButton.hidden = true;
    panel.appendChild(deleteButton);
    document.body.appendChild(panel);
  }

  /** Build one panel button with its shared and modifier classes. */
  private createButton(id: string, modifier: string, label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.className = `seer-panel__button ${modifier}`;
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }
}

/** Poll interval for keeping the panel in sync with the live route. */
const VISIBILITY_POLL_MS = 400;

/** Delay between the success notification and the automatic refresh of the route. */
const REFRESH_DELAY_MS = 2000;

/** Display duration of the failure notification in milliseconds. */
const FAILURE_TIMEOUT_MS = 8000;

/** Idle label of the Xstream search button. */
const XSTREAM_LABEL = '▶️ Xtreme';

/** Label shown while the Xstream search url is resolved and the tab opens. */
const OPENING_LABEL = 'Opening Xstream…';

/** Idle label of the deletion button. */
const DELETE_LABEL = '🗑️ Delete';

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
