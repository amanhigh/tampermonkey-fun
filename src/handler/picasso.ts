import { IWaitUtil } from '../util/wait';
import { Notifier } from '../util/notify';
import { IKeyUtil } from '../util/key';
import { ISmartPrompt } from '../util/smart';
import { PICASSO_CONSTANTS, PICASSO_KEY_MAPPINGS, PicassoCategory } from '../models/picasso';

export interface IPicassoHandler {
  initialize(): void;
}

export class PicassoHandler implements IPicassoHandler {
  // Derived from unified key mappings
  private get singleTapMappings() {
    return PICASSO_KEY_MAPPINGS.filter((mapping) => !mapping.isDoubleTap && mapping.selectors.length > 0);
  }

  private get doubleTapMappings() {
    return PICASSO_KEY_MAPPINGS.filter((mapping) => mapping.isDoubleTap && mapping.selectors.length > 0);
  }

  private modeIndicator: HTMLDivElement | null = null;

  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly keyUtil: IKeyUtil,
    private readonly smartPrompt: ISmartPrompt
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

  private showHelpModal(): void {
    const helpContent = this.buildHelpContent();
    this.smartPrompt.showModal(['Close'], []).catch(console.error);

    // Override modal content with help text and add Picasso-specific styling
    setTimeout(() => {
      const modal = document.getElementById('smart-modal');
      if (modal) {
        modal.className = 'aman-modal picasso-help'; // Add scoped CSS class
        modal.innerHTML = helpContent;
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.className = 'aman-modal-button';
        closeButton.onclick = () => {
          modal.style.display = 'none';
        };
        modal.appendChild(closeButton);
      }
    }, 10);
  }

  private buildHelpContent(): string {
    const { HELP } = PICASSO_CONSTANTS;
    let content = `<div class="aman-modal-content"><h2>${HELP.TITLE}</h2>`;

    // Group mappings by category using enum
    Object.entries(HELP.CATEGORIES).forEach(([categoryKey, categoryTitle]) => {
      const categoryEnum = categoryKey as keyof typeof PicassoCategory;
      const categoryMappings = PICASSO_KEY_MAPPINGS.filter((m) => m.category === PicassoCategory[categoryEnum]);

      if (categoryMappings.length > 0) {
        content += `<h3>${categoryTitle}</h3><ul>`;

        categoryMappings.forEach(({ key, description, isDoubleTap }) => {
          const displayKey = isDoubleTap ? `${key}${key}` : key;
          content += `<li><strong>${displayKey}</strong> - ${description}</li>`;
        });

        content += '</ul>';
      }
    });

    content += '</div>';
    return content;
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

    // Handle help key
    if (event.key === '?') {
      console.info('Help key pressed');
      event.preventDefault();
      this.showHelpModal();
      return;
    }

    // Check for double tap first
    if (this.keyUtil.isDoubleKey(event)) {
      const mapping = this.doubleTapMappings.find((m) => m.key === event.key.toLowerCase());
      if (mapping) {
        console.info(`Double Key ${event.key}, Clicked ${mapping.selectors}`);
        event.preventDefault();
        this.clickButton(mapping.selectors);
      }
      return;
    }

    // Existing single tap logic
    const mapping = this.singleTapMappings.find((m) => m.key === event.key.toLowerCase());
    if (mapping) {
      console.info(`Key, ${event.key}, Clicked ${mapping.selectors}`);
      event.preventDefault();
      this.clickButton(mapping.selectors);
    }
  }

  private clickButton(selectors: string[]): void {
    selectors.forEach((selector) => {
      this.waitUtil.waitClick(selector);
    });
  }
}
