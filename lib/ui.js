const areaCss = {
    'background-color': 'black',
    'color': 'white',
    'font-size': '15px',
    'position': 'absolute',
    'top': '15%',
    'left': '85%',
    'z-index': '9999'
};

function buildArea(id) {
    return $('<div>').attr('id', id).css(areaCss);
}

function buildInput(id) {
    return $('<input>').attr({'id': id});
}

function buildButton(id, text, handler) {
    return $('<button>').attr({'id': id}).html(text).click(handler);
}