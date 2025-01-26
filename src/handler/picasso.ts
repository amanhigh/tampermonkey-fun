import { IWaitUtil } from '../util/wait';
import { Notifier } from '../util/notify';
import { IKeyUtil } from '../util/key';

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
  };

  // Add double tap mappings
  private readonly doubleTapMap: HotkeyMap = {
    j: ['[aria-label="Ungroup selection"]'],
  };

  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly keyUtil: IKeyUtil
  ) {}

  public initialize(): void {
    this.setupKeyListener();
    Notifier.success('Picasso initialized 🎨');
  }

  private setupKeyListener(): void {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
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
