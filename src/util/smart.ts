type StyleProperties = Partial<CSSStyleDeclaration>;

/**
 * Smart prompt utility for creating interactive modal dialogs
 */
export class SmartPrompt {
    private modal: HTMLDivElement | null = null;

    /**
     * Shows a modal dialog with customizable buttons and options
     * @param reasons - Array of reason buttons to display
     * @param overrides - Optional array of override radio buttons
     * @returns Promise that resolves with the selected value
     */
    public async showModal(reasons: string[], overrides: string[] = []): Promise<string> {
        return new Promise((resolve) => {
            this.modal = this.createModal();
            document.body.appendChild(this.modal);

            reasons.forEach((reason, index) => {
                const button = this.createButton(reason, `smart-button-${index}`, resolve);
                this.modal!.appendChild(button);
            });

            const overrideContainer = document.createElement('div');
            Object.assign(overrideContainer.style, {
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap'
            });
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
                    if (this.modal) {
                        this.modal.style.display = 'none';
                    }
                }
            };
            window.addEventListener('keydown', keydownHandler);
        });
    }

    private createModal(): HTMLDivElement {
        const modal = document.createElement('div');
        modal.id = 'smart-modal';
        const styles: StyleProperties = {
            display: 'none',
            width: '300px',
            height: 'auto',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#000',
            color: '#fff',
            padding: '20px',
            textAlign: 'center',
            borderRadius: '8px'
        };
        Object.assign(modal.style, styles);
        return modal;
    }

    private createButton(text: string, id: string, callback: (value: string) => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = id;
        button.innerHTML = text;
        const styles: StyleProperties = {
            backgroundColor: '#fff',
            color: '#000',
            fontSize: '16px',
            margin: '4px',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            transition: 'background-color 0.3s, transform 0.1s'
        };
        Object.assign(button.style, styles);

        button.onmouseover = () => {
            button.style.backgroundColor = '#f0f0f0';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = '#fff';
        };
        button.onmousedown = () => {
            button.style.transform = 'scale(0.95)';
        };
        button.onmouseup = () => {
            button.style.transform = 'scale(1)';
        };
        button.onclick = () => {
            const selectedOverride = this.getSelectedOverride();
            callback(selectedOverride ? `${text}-${selectedOverride}` : text);
            if (this.modal) {
                this.modal.style.display = 'none';
            }
        };
        return button;
    }

    private createTextBox(id: string, callback: (value: string) => void): HTMLInputElement {
        const textBox = document.createElement('input');
        textBox.id = id;
        textBox.type = 'text';
        textBox.placeholder = 'Enter Reason';
        const styles: StyleProperties = {
            backgroundColor: '#000',
            color: '#fff',
            fontSize: '16px',
            margin: '4px',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #444',
            outline: 'none',
            width: 'calc(100% - 24px)',
            transition: 'border-color 0.3s'
        };
        Object.assign(textBox.style, styles);

        textBox.onfocus = () => {
            textBox.style.borderColor = '#666';
        };
        textBox.onblur = () => {
            textBox.style.borderColor = '#444';
        };
        textBox.onkeydown = (event) => {
            if (event.key === 'Enter') {
                callback(textBox.value);
                if (this.modal) {
                    this.modal.style.display = 'none';
                }
            }
        };
        return textBox;
    }

    private createRadioButton(text: string, id: string): HTMLLabelElement {
        const label = document.createElement('label');
        const labelStyles: StyleProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            color: '#fff',
            marginRight: '10px',
            fontSize: '18px',
            cursor: 'pointer'
        };
        Object.assign(label.style, labelStyles);

        const radioButton = document.createElement('input');
        radioButton.id = id;
        radioButton.type = 'radio';
        radioButton.name = 'override';
        radioButton.value = text;
        // HACK: Use Less Based Styles
        const radioStyles: StyleProperties = {
            appearance: 'none',
            width: '16px',
            height: '16px',
            border: '2px solid white',
            borderRadius: '50%',
            backgroundColor: 'black',
            cursor: 'pointer',
            marginRight: '8px',
            verticalAlign: 'middle',
            position: 'relative'
        };
        Object.assign(radioButton.style, radioStyles);

        radioButton.onchange = function() {
            document.querySelectorAll('input[name="override"]').forEach((rb) => {
                if (rb instanceof HTMLInputElement) {
                    rb.style.backgroundColor = 'black';
                }
            });
            if (this.checked) {
                this.style.backgroundColor = 'white';
            }
        };

        label.appendChild(radioButton);
        label.appendChild(document.createTextNode(` ${text}`));

        return label;
    }

    private getSelectedOverride(): string | null {
        const selectedRadio = document.querySelector('input[name="override"]:checked');
        return selectedRadio instanceof HTMLInputElement ? selectedRadio.value : null;
    }
}
