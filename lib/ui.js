const areaCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
    'position': 'absolute',
    'top': '10%',
    'left': '85%',
    'z-index': '9999'
};

function buildArea(id) {
    return $('<div>').attr({'id': id}).css(areaCss);
}

function buildWrapper(id) {
    return $('<div>').attr({'id': id});
}

function buildInput(id) {
    return $('<input>').attr({'id': id, 'type': 'button'});
}

function buildCheckBox(id, checked) {
    return $('<input>').attr({'id': id, 'type': 'checkbox'}).prop('checked', checked);
}

function buildText(text,id) {
    return $('<p>').attr({'id': id}).html(text);

}

function buildRadio(label, value, group) {
    let wrapper = buildWrapper();
    buildText(label).appendTo(wrapper);
    $('<input>').attr({'id': `aman-${group}-${value}`, 'type': 'radio', 'name': group, 'value': value}).appendTo(wrapper);
    return wrapper;
}

function buildButton(id, text, handler) {
    return $('<button>').attr({'id': id}).html(text).click(handler);
}

//Table
function buildTable(id) {
    return $('<table>').attr({'id': id});
}

function buildRow(id) {
    return $('<tr>').attr({'id': id});
}

function buildCell(label) {
    return $('<td>').html(label);
}