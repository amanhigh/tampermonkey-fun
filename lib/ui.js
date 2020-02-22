const areaCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
    'position': 'absolute',
    'top': '10%',
    'left': '85%',
    'z-index': '9999'
};

//Areas
function buildArea(id) {
    return $('<div>').attr({'id': id}).css(areaCss);
}

function buildWrapper(id) {
    return $('<div>').attr({'id': id});
}

//Input
function buildInput(id) {
    return $('<input>').attr({'id': id});
}

//Buttons
function buildButton(id, text, handler) {
    return $('<button>').attr({'id': id}).html(text).click(handler);
}

function buildCheckBox(id, checked) {
    return $('<input>').attr({'id': id, 'type': 'checkbox'}).prop('checked', checked);
}

function buildRadio(label, value, group, checked=false) {
    let radio = $('<input>').attr({'id': `aman-${group}-${value}`, 'type': 'radio', 'name': group, 'value': value}).prop('checked',checked);
    return buildLabel(label).prepend(radio);
}

//Text
function buildLabel(text, id) {
    return $('<label>').attr({'id': id, 'font-size': '15px'}).html(text);
}

//Table
function buildTable(id) {
    return $('<table>').attr({'id': id});
}

function buildHeader(id) {
    return $('<th>').attr({'id': id});
}

function buildRow(id) {
    return $('<tr>').attr({'id': id});
}

function buildCell(label) {
    return $('<td>').html(label);
}