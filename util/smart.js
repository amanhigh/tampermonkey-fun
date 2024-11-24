class SmartPrompt {
    constructor() {
      this.modal = null;
    }
  
    showModal(reasons, overrides = []) {
      return new Promise((resolve) => {
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
  
        reasons.forEach((reason, index) => {
          const button = this.createButton(reason, `smart-button-${index}`, resolve);
          this.modal.appendChild(button);
        });
  
        const overrideContainer = document.createElement('div');
        overrideContainer.style.display = 'flex';
        overrideContainer.style.justifyContent = 'center';
        overrideContainer.style.flexWrap = 'wrap';
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
  
        const keydownHandler = (event) => {
          if (event.key === 'Escape') {
            resolve('');
            this.modal.style.display = 'none';
          }
        };
        window.addEventListener('keydown', keydownHandler);
      });
    }
  
    createModal() {
      const modal = document.createElement('div');
      modal.id = 'smart-modal';
      Object.assign(modal.style, {
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
        borderRadius: '8px',
      });
      return modal;
    }
  
    createButton(text, id, callback) {
      const button = document.createElement('button');
      button.id = id;
      button.innerHTML = text;
      Object.assign(button.style, {
        backgroundColor: '#fff',
        color: '#000',
        fontSize: '16px',
        margin: '4px',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        transition: 'background-color 0.3s, transform 0.1s',
      });
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
        this.modal.style.display = 'none';
      };
      return button;
    }
  
    createTextBox(id, callback) {
      const textBox = document.createElement('input');
      textBox.id = id;
      textBox.type = 'text';
      textBox.placeholder = 'Enter Reason';
      Object.assign(textBox.style, {
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '16px',
        margin: '4px',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #444',
        outline: 'none',
        width: 'calc(100% - 24px)',
        transition: 'border-color 0.3s',
      });
      textBox.onfocus = () => {
        textBox.style.borderColor = '#666';
      };
      textBox.onblur = () => {
        textBox.style.borderColor = '#444';
      };
      textBox.onkeydown = function (event) {
        if (event.key === 'Enter') {
          callback(this.value);
          this.modal.style.display = 'none';
        }
      };
      return textBox;
    }
  
    createRadioButton(text, id) {
      const label = document.createElement('label');
      Object.assign(label.style, {
        display: 'inline-flex',
        alignItems: 'center',
        color: '#fff',
        marginRight: '10px',
        fontSize: '18px',
        cursor: 'pointer',
      });
  
      const radioButton = document.createElement('input');
      radioButton.id = id;
      radioButton.type = 'radio';
      radioButton.name = 'override';
      radioButton.value = text;
      Object.assign(radioButton.style, {
        appearance: 'none',
        '-webkit-appearance': 'none',
        '-moz-appearance': 'none',
        width: '16px',
        height: '16px',
        border: '2px solid white',
        borderRadius: '50%',
        backgroundColor: 'black',
        cursor: 'pointer',
        marginRight: '8px',
        verticalAlign: 'middle',
        position: 'relative',
      });
  
      radioButton.onchange = function () {
        document.querySelectorAll('input[name="override"]').forEach((rb) => {
          rb.style.backgroundColor = 'black';
        });
        if (this.checked) {
          this.style.backgroundColor = 'white';
        }
      };
  
      label.appendChild(radioButton);
      label.appendChild(document.createTextNode(' ' + text));
  
      return label;
    }
  
    getSelectedOverride() {
      const selectedRadio = document.querySelector('input[name="override"]:checked');
      return selectedRadio ? selectedRadio.value : null;
    }
  }