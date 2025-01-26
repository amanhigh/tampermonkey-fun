import { IWaitUtil } from '../util/wait';
import { Notifier } from '../util/notify';

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
    // Example combo: 'c': ['[data-testid="toolbar-circle"]', '[aria-label="Fill color"]']
  };

  constructor(private readonly waitUtil: IWaitUtil) {}

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
