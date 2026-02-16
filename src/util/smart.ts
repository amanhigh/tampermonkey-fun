/**
 * Interface for smart prompt utility operations
 */
export interface ISmartPrompt {
  /**
   * Shows a modal dialog with customizable buttons and options
   * @param reasons - Array of reason buttons to display
   * @param overrides - Optional array of override radio buttons
   * @returns Promise that resolves with the selected value
   */
  showModal(reasons: string[], overrides?: string[]): Promise<string>;
}

/**
 * Smart prompt utility for creating interactive modal dialogs
 */
export class SmartPrompt implements ISmartPrompt {
  private modal: HTMLDivElement | null = null;
  private escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  // UI Component Classes
  private static readonly CLASSES = {
    MODAL: 'aman-modal',
    MODAL_CONTENT: 'aman-modal-content',
    MODAL_BUTTON: 'aman-modal-button',
    MODAL_INPUT: 'aman-modal-input',
    MODAL_RADIO_LABEL: 'aman-modal-radio-label',
  };

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.id = 'smart-modal';
    modal.className = SmartPrompt.CLASSES.MODAL;
    return modal;
  }

  private createButton(text: string, id: string, callback: (value: string) => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = text;
    button.className = SmartPrompt.CLASSES.MODAL_BUTTON;

    button.onclick = () => {
      const selectedOverride = this.getSelectedOverride();
      callback(selectedOverride ? `${text}-${selectedOverride}` : text);
      this.destroyModal();
    };
    return button;
  }

  private createTextBox(id: string, callback: (value: string) => void): HTMLInputElement {
    const textBox = document.createElement('input');
    textBox.id = id;
    textBox.type = 'text';
    textBox.placeholder = 'Enter Reason';
    textBox.className = SmartPrompt.CLASSES.MODAL_INPUT;

    textBox.onkeydown = (event) => {
      if (event.key === 'Enter') {
        callback(textBox.value);
        this.destroyModal();
      }
    };
    return textBox;
  }

  private createRadioButton(text: string, id: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = SmartPrompt.CLASSES.MODAL_RADIO_LABEL;

    const radioButton = document.createElement('input');
    radioButton.id = id;
    radioButton.type = 'radio';
    radioButton.name = 'override';
    radioButton.value = text;

    radioButton.addEventListener('change', function () {
      document.querySelectorAll('input[name="override"]').forEach((rb) => {
        if (rb instanceof HTMLInputElement) {
          rb.style.backgroundColor = 'black';
        }
      });
      if (this instanceof HTMLInputElement && this.checked) {
        this.style.backgroundColor = 'white';
      }
    });

    label.appendChild(radioButton);
    label.appendChild(document.createTextNode(` ${text}`));

    return label;
  }

  /** @inheritdoc */
  public async showModal(reasons: string[], overrides: string[] = []): Promise<string> {
    return new Promise((resolve) => {
      this.destroyModal();
      this.modal = this.createModal();
      document.body.appendChild(this.modal);

      // Reset state at start
      this.resetRadioState();

      reasons.forEach((reason, index) => {
        const button = this.createButton(reason, `smart-button-${index}`, resolve);
        if (!this.modal) {
          throw new Error('Modal not initialized');
        }
        this.modal.appendChild(button);
      });

      const overrideContainer = document.createElement('div');
      overrideContainer.className = SmartPrompt.CLASSES.MODAL_CONTENT;
      this.modal.appendChild(overrideContainer);

      overrides.forEach((override, index) => {
        const radioButton = this.createRadioButton(override, `smart-radio-${index}`);
        overrideContainer.appendChild(radioButton);
      });

      const textBox = this.createTextBox('smart-text', resolve);
      this.modal.appendChild(textBox);

      const cancelButton = this.createButton('Cancel', 'smart-cancel', resolve);
      this.modal.appendChild(cancelButton);

      this.modal.style.display = 'block';

      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          resolve('');
          this.destroyModal();
        }
      };
      this.escapeHandler = keydownHandler;
      window.addEventListener('keydown', keydownHandler);
    });
  }

  private destroyModal(): void {
    if (this.escapeHandler) {
      window.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    if (this.modal && this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
    this.modal = null;
  }

  private resetRadioState(): void {
    const radioButtons = document.querySelectorAll('input[name="override"]');
    radioButtons.forEach((rb) => {
      if (rb instanceof HTMLInputElement) {
        rb.checked = false;
        rb.style.backgroundColor = 'black';
      }
    });
  }

  private getSelectedOverride(): string | null {
    const selectedRadio = document.querySelector('input[name="override"]:checked');
    return selectedRadio instanceof HTMLInputElement && selectedRadio.checked ? selectedRadio.value : null;
  }
}
