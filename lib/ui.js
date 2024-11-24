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

const textBoxCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
    'margin': '4px',
    'padding': '6px 8px',
    'border': '1px solid #444',
    'border-radius': '4px',
    'outline': 'none',
    'transition': 'border-color 0.3s'
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
    return $('<input>').attr({ 'id': id }).css(textBoxCss)
        .focus(() => $(this).css('border-color', '#666'))
        .blur(() => $(this).css('border-color', '#444'));
}

//Text
function buildLabel(text, color = 'white', id) {
    return $(`<label>`).attr({ 'id': id }).css(elementCss).css('color', color).html(text);
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