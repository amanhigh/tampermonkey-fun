const areaCss = {
    'position': 'absolute',
    'top': '10%',
    'left': '70%',
    'z-index': '9999'
};

const elementCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
}

//Areas
function buildArea(id) {
    return $('<div>').attr({'id': id}).css(areaCss);
}

function buildWrapper(id) {
    return $('<div>').attr({'id': id});
}

//Input
function buildInput(id) {
    return $('<input>').attr({'id': id}).css(elementCss);
}

//Buttons
function buildButton(id, text, handler) {
    return $('<button>').attr({'id': id}).html(text).css(elementCss).click(handler);
}

function buildCheckBox(id, checked) {
    return $('<input>').attr({'id': id, 'type': 'checkbox'}).css(elementCss).prop('checked', checked);
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
function buildLabel(text, id) {
    return $('<label>').attr({'id': id}).css(elementCss).html(text);
}

//Table
function buildTable(id) {
    return $('<table>').attr({'id': id});
}

function buildRow(id) {
    return $('<tr>').attr({'id': id});
}

function buildHeader(label) {
    return $('<th>').html(label);
}

function buildCell(label) {
    return $('<td>').html(label);
}