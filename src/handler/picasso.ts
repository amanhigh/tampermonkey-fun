import { IWaitUtil } from '../util/wait';
import { Notifier } from '../util/notify';
import { IKeyUtil } from '../util/key';
import { PICASSO_CONSTANTS } from '../models/picasso';

export interface IPicassoHandler {
  initialize(): void;
}

interface HotkeyMap {
  [key: string]: string[];
}

export class PicassoHandler implements IPicassoHandler {
  private readonly buttonMap: HotkeyMap = {
    ',': ['[data-testid="toolbar-rectangle"]'],
    u: ['[data-testid="toolbar-diamond"]'],
    ';': ['[aria-label="Delete"]'],
    y: ['[data-testid="main-menu-trigger"]', '[aria-label="Reset the canvas"]'],
    "'": ['[data-testid="button-undo"]'],
    '.': ['[data-testid="button-redo"]'],
    j: ['[aria-label="Group selection"]'],
    p: ['[data-testid="main-menu-trigger"]', '[aria-label="Center vertically"]'],
    i: ['[data-testid="main-menu-trigger"]', '[aria-label="Center horizontally"]'],
  };

  // Add double tap mappings
  private readonly doubleTapMap: HotkeyMap = {
    j: ['[aria-label="Ungroup selection"]'],
  };

  private modeIndicator: HTMLDivElement | null = null;

  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly keyUtil: IKeyUtil
  ) {}

  private createModeIndicator(): void {
    this.modeIndicator = document.createElement('div');
    this.modeIndicator.className = PICASSO_CONSTANTS.CLASSES.MODE_INDICATOR;
    document.body.appendChild(this.modeIndicator);
    this.updateModeIndicator();
  }

  private isTextEditingMode(): boolean {
    return !!document.querySelector(`.${PICASSO_CONSTANTS.CLASSES.TEXT_EDITOR}`);
  }

  private updateModeIndicator(): void {
    if (this.modeIndicator) {
      this.modeIndicator.textContent = this.isTextEditingMode()
        ? PICASSO_CONSTANTS.INDICATOR.TEXT_MODE
        : PICASSO_CONSTANTS.INDICATOR.DRAW_MODE;
    }
  }

  private setupModeDetection(): void {
    document.addEventListener('focusin', () => this.updateModeIndicator());
    document.addEventListener('focusout', () => this.updateModeIndicator());
  }

  public initialize(): void {
    this.createModeIndicator();
    this.setupModeDetection();
    this.setupKeyListener();
    Notifier.success('Picasso initialized 🎨');
  }

  private setupKeyListener(): void {
    document.addEventListener('keydown', (e) => {
      // Only handle drawing hotkeys if not in text editing mode
      if (!this.isTextEditingMode()) {
        this.handleKeyPress(e);
      }
    });
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }

    // Check for double tap first
    if (this.keyUtil.isDoubleKey(event)) {
      const selector = this.doubleTapMap[event.key.toLowerCase()];
      if (selector) {
        console.info(`Double Key ${event.key}, Clicked ${selector}`);
        event.preventDefault();
        this.clickButton(selector);
      }
      return;
    }

    // Existing single tap logic
    const selector = this.buttonMap[event.key.toLowerCase()];
    if (selector) {
      console.info(`Key, ${event.key}, Clicked ${selector}`);
      event.preventDefault();
      this.clickButton(selector);
    }
  }

  private clickButton(selectors: string[]): void {
    selectors.forEach((selector) => {
      this.waitUtil.waitClick(selector);
    });
  }
}
