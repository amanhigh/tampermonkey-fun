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
    return $('<button>').attr({ 'id': id }).html(text).css(elementCss).click(handler);
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

//Helpers
function toggleUI(selector) {
    let $e = $(selector);
    $e.is(":visible") ? $e.hide() : $e.show();
}