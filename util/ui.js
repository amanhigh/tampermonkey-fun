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
    /**
     * Builds a button element with the specified id, text, and click handler.
     *
     * @param {string} id - The id of the button
     * @param {string} text - The text to display on the button
     * @param {function} handler - The function to be executed when the button is clicked
     * @return {jQuery} The constructed button element
     */
    buildButton(id, text, handler) {
        return $('<button>')
          .attr({ id: id })
          .html(text)
          .css(Styles.BUTTON.BASE)
          .hover(
            function () {
                $(this).css(Styles.BUTTON.HOVER);
            },
            function () {
                $(this).css(Styles.BUTTON.BASE);
            }
          )
          .mousedown(function () {
              $(this).css(Styles.BUTTON.ACTIVE);
          })
          .mouseup(function () {
              $(this).css(Styles.BUTTON.HOVER);
          })
          .click(handler);
      }
    
    buildCheckBox(id, checked) {
        return $('<input>')
          .attr({ id: id, type: 'checkbox' })
          .css(Styles.CHECKBOX.BASE)
          .prop('checked', checked);
      }
    
    buildRadio(label, value, group, checked = false) {
        const radio = $('<input>')
          .attr({
            id: `aman-${group}-${value}`,
            type: 'radio',
            name: group,
            value: value,
          })
          .css(Styles.RADIO.BASE)
          .prop('checked', checked);
    
        radio.on('change', function () {
          $(`input[name="${group}"]`).css('background-color', 'black');
          if (this.checked) {
            $(this).css('background-color', 'white');
          }
        });
  
      return this.buildLabel(label).prepend(radio);
    }
}