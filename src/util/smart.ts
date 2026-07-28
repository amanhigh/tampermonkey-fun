/**
 * Smart prompt response types and choice group configuration.
 *
 * The modal presents:
 * 1. Primary choice buttons — the main submit actions
 * 2. Zero or more choice groups — each renders independent radio buttons
 * 3. A free-text input for custom text
 * 4. Cancel / None action buttons
 */
export interface SmartChoiceGroup {
  /** Unique identifier for this group, used as the key in answers */
  id: string;
  /** Visible label displayed above the group's radio buttons */
  label: string;
  /** Available choices rendered as radio buttons */
  choices: readonly string[];
  /** Pre-selected choice when the modal opens */
  defaultChoice?: string;
}

/**
 * Response from SmartPrompt.showModal()
 *
 * - `cancel`   — user pressed Cancel or Escape (no selection made)
 * - `none`     — user pressed None or submitted empty text (no primary chosen)
 * - `selected` — user clicked a primary button or submitted custom text
 */
export type SmartPromptResponse =
  | { type: 'cancel'; value: null }
  | { type: 'none'; value: 'none'; answers: Readonly<Record<string, string | null>> }
  | { type: 'selected'; primarySelection: string; answers: Readonly<Record<string, string | null>> };

/**
 * Interface for smart prompt utility operations
 */
export interface ISmartPrompt {
  /**
   * Shows a modal dialog with primary choice buttons and structured choice groups.
   * @param primaryChoices - Array of primary choice button labels
   * @param groups - Choice groups, each rendering as an independent set of radio buttons
   * @returns Promise that resolves with SmartPromptResponse:
   * - { type: 'cancel', value: null } if user cancelled
   * - { type: 'none', value: 'none', answers } if user chose none (None button or Escape key)
   * - { type: 'selected', primarySelection: string, answers } if user selected a primary choice or entered text
   */
  showModal(primaryChoices: string[], groups?: SmartChoiceGroup[]): Promise<SmartPromptResponse>;

  /**
   * Shows a textarea modal dialog with default text and explicit save/cancel actions.
   * @param title Title shown above the textarea
   * @param defaultValue Initial textarea value
   * @param submitLabel Label for the submit button
   * @returns Promise resolving with trimmed text or null when cancelled
   */
  showTextareaModal(title: string, defaultValue: string, submitLabel?: string): Promise<string | null>;
}

/**
 * Smart prompt utility for creating interactive modal dialogs.
 *
 * Renders a fixed-position overlay with primary choice buttons,
 * optional choice groups (radio buttons), a free-text input, and
 * Cancel / None action buttons.
 */
export class SmartPrompt implements ISmartPrompt {
  private modal: HTMLDivElement | null = null;
  private escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  // UI Component Classes
  private static readonly CLASSES = {
    MODAL: 'aman-modal',
    MODAL_CONTENT: 'aman-modal-content',
    MODAL_TITLE: 'aman-modal-title',
    MODAL_BUTTON: 'aman-modal-button',
    MODAL_INPUT: 'aman-modal-input',
    MODAL_TEXTAREA: 'aman-modal-textarea',
    MODAL_RADIO_LABEL: 'aman-modal-radio-label',
    MODAL_GROUP: 'aman-modal-group',
    MODAL_GROUP_LABEL: 'aman-modal-group-label',
    MODAL_ACTIONS: 'aman-modal-actions',
  };

  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.id = 'smart-modal';
    modal.className = SmartPrompt.CLASSES.MODAL;
    return modal;
  }

  private createPrimaryButton(
    text: string,
    id: string,
    callback: (response: SmartPromptResponse) => void
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.className = SmartPrompt.CLASSES.MODAL_BUTTON;

    button.onclick = () => {
      const answers = this.getGroupAnswers();
      callback({ type: 'selected', primarySelection: text, answers });
      this.destroyModal();
    };
    return button;
  }

  private createCancelButton(id: string, callback: (response: SmartPromptResponse) => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = 'Cancel';
    button.className = SmartPrompt.CLASSES.MODAL_BUTTON;

    button.onclick = () => {
      callback({ type: 'cancel', value: null });
      this.destroyModal();
    };
    return button;
  }

  private createNoneButton(id: string, callback: (response: SmartPromptResponse) => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = 'None';
    button.className = SmartPrompt.CLASSES.MODAL_BUTTON;

    button.onclick = () => {
      const answers = this.getGroupAnswers();
      callback({ type: 'none', value: 'none', answers });
      this.destroyModal();
    };
    return button;
  }

  private createTextBox(id: string, callback: (response: SmartPromptResponse) => void): HTMLInputElement {
    const textBox = document.createElement('input');
    textBox.id = id;
    textBox.type = 'text';
    textBox.placeholder = 'Enter custom text…';
    textBox.className = SmartPrompt.CLASSES.MODAL_INPUT;

    textBox.onkeydown = (event) => {
      if (event.key === 'Enter') {
        const value = textBox.value.trim();
        if (value === '') {
          const answers = this.getGroupAnswers();
          callback({ type: 'none', value: 'none', answers });
        } else {
          const answers = this.getGroupAnswers();
          callback({ type: 'selected', primarySelection: value, answers });
        }
        this.destroyModal();
      }
    };
    return textBox;
  }

  private createTitle(text: string): HTMLHeadingElement {
    const title = document.createElement('h3');
    title.className = SmartPrompt.CLASSES.MODAL_TITLE;
    title.textContent = text;
    return title;
  }

  private createTextarea(id: string, defaultValue: string): HTMLTextAreaElement {
    const textArea = document.createElement('textarea');
    textArea.id = id;
    textArea.className = `${SmartPrompt.CLASSES.MODAL_INPUT} ${SmartPrompt.CLASSES.MODAL_TEXTAREA}`;
    textArea.value = defaultValue;
    return textArea;
  }

  private createGroupContainer(group: SmartChoiceGroup): HTMLDivElement {
    const container = document.createElement('div');
    container.className = SmartPrompt.CLASSES.MODAL_GROUP;

    if (group.label) {
      const label = document.createElement('div');
      label.className = SmartPrompt.CLASSES.MODAL_GROUP_LABEL;
      label.textContent = group.label;
      container.appendChild(label);
    }

    group.choices.forEach((choice, index) => {
      const radioLabel = this.createGroupRadioButton(choice, group.id, index, group.defaultChoice);
      container.appendChild(radioLabel);
    });

    return container;
  }

  private createGroupRadioButton(
    text: string,
    groupId: string,
    index: number,
    defaultChoice?: string
  ): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = SmartPrompt.CLASSES.MODAL_RADIO_LABEL;

    const radioButton = document.createElement('input');
    radioButton.id = `smart-radio-${groupId}-${index}`;
    radioButton.type = 'radio';
    radioButton.name = `group-${groupId}`;
    radioButton.value = text;
    radioButton.checked = text === defaultChoice;

    label.appendChild(radioButton);
    label.appendChild(document.createTextNode(` ${text}`));

    return label;
  }

  /** @inheritdoc */
  public async showModal(primaryChoices: string[], groups: SmartChoiceGroup[] = []): Promise<SmartPromptResponse> {
    return new Promise((resolve) => {
      this.destroyModal();
      this.modal = this.createModal();
      document.body.appendChild(this.modal);

      // Primary choice buttons
      primaryChoices.forEach((choice, index) => {
        const button = this.createPrimaryButton(choice, `smart-button-${index}`, resolve);
        this.modal!.appendChild(button);
      });

      // Choice groups
      groups.forEach((group) => {
        const groupContainer = this.createGroupContainer(group);
        this.modal!.appendChild(groupContainer);
      });

      // Free-text input
      const textBox = this.createTextBox('smart-text', resolve);
      this.modal!.appendChild(textBox);

      // Action buttons
      const actionsContainer = document.createElement('div');
      actionsContainer.className = SmartPrompt.CLASSES.MODAL_ACTIONS;
      actionsContainer.appendChild(this.createCancelButton('smart-cancel', resolve));
      actionsContainer.appendChild(this.createNoneButton('smart-none', resolve));
      this.modal!.appendChild(actionsContainer);

      this.modal.style.display = 'block';

      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          const answers = this.getGroupAnswers();
          resolve({ type: 'none', value: 'none', answers });
          this.destroyModal();
        }
      };
      this.escapeHandler = keydownHandler;
      window.addEventListener('keydown', keydownHandler);
    });
  }

  /** @inheritdoc */
  public async showTextareaModal(title: string, defaultValue: string, submitLabel = 'Save'): Promise<string | null> {
    return new Promise((resolve) => {
      this.destroyModal();
      this.modal = this.createModal();
      document.body.appendChild(this.modal);

      if (!this.modal) {
        throw new Error('Modal not initialized');
      }

      this.modal.appendChild(this.createTitle(title));

      const textArea = this.createTextarea('smart-textarea', defaultValue);
      this.modal.appendChild(textArea);

      const buttonContainer = document.createElement('div');
      buttonContainer.className = SmartPrompt.CLASSES.MODAL_ACTIONS;

      const saveButton = document.createElement('button');
      saveButton.id = 'smart-textarea-save';
      saveButton.textContent = submitLabel;
      saveButton.className = SmartPrompt.CLASSES.MODAL_BUTTON;
      saveButton.onclick = () => {
        resolve(textArea.value.trim());
        this.destroyModal();
      };

      const cancelButton = this.createCancelButton('smart-textarea-cancel', () => {
        resolve(null);
      });

      buttonContainer.appendChild(saveButton);
      buttonContainer.appendChild(cancelButton);
      this.modal.appendChild(buttonContainer);
      this.modal.style.display = 'block';
      textArea.focus();

      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          resolve(null);
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

  /**
   * Collects current radio selections across all choice groups.
   * Returns a record keyed by group id, with the selected value or null.
   */
  private getGroupAnswers(): Readonly<Record<string, string | null>> {
    const answers: Record<string, string | null> = {};
    if (!this.modal) return answers;

    const radios = this.modal.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const groupIds = new Set<string>();

    radios.forEach((radio) => {
      if (radio.name.startsWith('group-')) {
        groupIds.add(radio.name.slice(6)); // strip "group-" prefix
      }
    });

    groupIds.forEach((groupId) => {
      const checked = this.modal!.querySelector(`input[name="group-${groupId}"]:checked`) as HTMLInputElement | null;
      answers[groupId] = checked ? checked.value : null;
    });

    return answers;
  }
}
