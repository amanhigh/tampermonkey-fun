const areaCss = {
    'position': 'absolute',
    'z-index': '9999'
};

const elementCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
    'margin': '2px'
}

const buttonCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '12px',
    'margin': '4px',
    'padding': '4px 6px',
    'border-radius': '4px',
    'cursor': 'pointer'
};

//UI Ids
const areaId = 'aman-area';

//Areas
function buildArea(id, left = '70%', top = '10%') {
    return $('<div>').attr({ 'id': id }).css(areaCss)
        .css('left', left).css('top', top);
}

/**
 * Creates a wrapper div element with the specified id and width.
 *
 * @param {string} id - The id for the wrapper div element
 * @param {string} [width='300px'] - The width of the wrapper div element (default is '300px')
 * @return {jQuery} The wrapper div element
 */
function buildWrapper(id, width = '300px') {
    return $('<div>').attr({ 'id': id }).css('width', width);
}

//Input
function buildInput(id) {
    return $('<input>').attr({ 'id': id }).css(elementCss);
}

//Buttons

/**
 * Builds a button element with the specified id, text, and click handler.
 *
 * @param {string} id - The id of the button
 * @param {string} text - The text to display on the button
 * @param {function} handler - The function to be executed when the button is clicked
 * @return {jQuery} The constructed button element
 */
function buildButton(id, text, handler) {
    return $('<button>').attr({ 'id': id }).html(text).css(buttonCss).click(handler);
}

function buildCheckBox(id, checked) {
    return $('<input>').attr({ 'id': id, 'type': 'checkbox' }).css(elementCss).prop('checked', checked);
}

function buildRadio(label, value, group, checked = false) {
    let radio = $('<input>').attr({
        'id': `aman-${group}-${value}`,
        'type': 'radio',
        'name': group,
        'value': value
    }).css(elementCss).prop('checked', checked);
    return buildLabel(label).prepend(radio);
}

//Text
function buildLabel(text, color = 'white', id) {
    return $(`<label>`).attr({ 'id': id }).css(elementCss).css('color', color).html(text);
}

//Table
function buildTable(id) {
    return $('<table>').attr({ 'id': id });
}

function buildRow(id) {
    return $('<tr>').attr({ 'id': id });
}

function buildHeader(label) {
    return $('<th>').html(label);
}

function buildCell(label) {
    return $('<td>').html(label);
}

/** Interaction **/
function SmartPrompt(reasons, overrides = []) {
    let modal = document.getElementById('smart-modal');

    // Remove the existing modal if it exists
    if (modal) {
        modal.remove();
    }

    return new Promise((resolve) => {
        // Recreate the modal
        modal = createSmartModal();
        document.body.appendChild(modal);

        // Add Reasons
        reasons.forEach((reason, index) => {
            const button = createSmartButton(reason, `smart-button-${index}`, modal, resolve);
            modal.appendChild(button);
        });

        // Add Overrides
        const overrideContainer = document.createElement('div');
        overrideContainer.style.display = 'flex';
        overrideContainer.style.justifyContent = 'center';
        overrideContainer.style.flexWrap = 'wrap';
        modal.appendChild(overrideContainer);

        overrides.forEach((override, index) => {
            const radioButton = createSmartRadioButton(override, `smart-radio-${index}`, overrideContainer);
            overrideContainer.appendChild(radioButton);
        });

        // Add Text Box and Cancel
        const textBox = createSmartTextBox('smart-text', modal, resolve);
        modal.appendChild(textBox);

        const cancelButton = createSmartButton('Cancel', 'smart-cancel', modal, resolve);
        modal.appendChild(cancelButton);

        modal.style.display = 'block';

        const keydownHandler = (event) => {
            if (event.key === 'Escape') {
                resolve('');
                modal.style.display = 'none';
            }
        };
        window.addEventListener('keydown', keydownHandler);
    })
}

function createSmartModal() {
    const modal = document.createElement('div');
    modal.id = 'smart-modal';
    Object.assign(modal.style, {
        display: 'none',
        width: '200px',
        height: '200px',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#000',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
    });
    return modal;
}

/**
 * Creates a smart button with the specified text, id, modal, callback, and getOverride function.
 *
 * @param {string} text - The text to display on the button.
 * @param {string} id - The id of the button.
 * @param {HTMLElement} modal - The modal element that the button will be appended to.
 * @param {function} callback - The callback function to be executed when the button is clicked.
 * @param {function} getOverride - The function to get the selected override value.
 * @return {HTMLButtonElement} The created smart button.
 */
function createSmartButton(text, id, modal, callback) {
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = text;
    button.style.background = '#fff';
    button.style.color = '#000';
    button.onclick = () => {
        const selectedOverride = getOverride();
        callback(selectedOverride ? `${text}-${selectedOverride}` : text);
        modal.style.display = 'none';
    };
    return button;
}

function createSmartTextBox(id, modal, callback) {
    const textBox = document.createElement('input');
    textBox.id = id;
    textBox.type = 'text';
    textBox.placeholder = 'Enter Reason';
    textBox.style.background = '#fff';
    textBox.style.color = '#000';
    textBox.onkeydown = function (event) {
        if (event.key === 'Enter') {
            callback(this.value);
            modal.style.display = 'none';
        }
    };
    return textBox;
}

function createSmartRadioButton(text, id, modal) {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.color = '#fff';
    label.style.marginRight = '10px';

    const radioButton = document.createElement('input');
    radioButton.id = id;
    radioButton.type = 'radio';
    radioButton.name = 'override';
    radioButton.value = text;

    label.appendChild(radioButton);
    label.appendChild(document.createTextNode(' ' + text));
    modal.appendChild(label);

    return label;
}

function getOverride() {
    return document.querySelector('input[name="override"]:checked')?.value;
}

//Helpers

/**
 * Toggles the visibility of the specified element.
 *
 * @param {string} selector - The CSS selector of the element to be toggled
 * @return {void} 
 */
function toggleUI(selector) {
    let $e = $(selector);
    $e.is(":visible") ? $e.hide() : $e.show();
}