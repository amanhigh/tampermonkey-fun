class UIUtil {
    buildArea(id, left = '70%', top = '10%') {
        return $('<div>')
            .attr({ id: id })
            .css({
                ...Styles.AREA.BASE,
                left: left,
                top: top,
            });
    }

    buildWrapper(id, width = '300px') {
        return $('<div>')
            .attr({ id: id })
            .css({
                width: width,
            });
    }

    buildInput(id) {
        return $('<input>')
            .attr({ id: id })
            .css(Styles.INPUT.BASE)
            .focus(function () {
                $(this).css(Styles.INPUT.FOCUS);
            })
            .blur(function () {
                $(this).css(Styles.INPUT.BLUR);
            });
    }

    buildLabel(text, color = 'white', id) {
        return $('<label>')
            .attr({ id: id })
            .css({
                ...Styles.LABEL.BASE,
                color: color,
            })
            .html(text);
    }

    toggleUI(selector) {
        const $element = $(selector);
        $element.is(':visible') ? $element.hide() : $element.show();
    }
}