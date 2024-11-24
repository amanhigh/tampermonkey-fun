class ButtonUtil {
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
        .css({
          backgroundColor: 'black',
          color: 'white',
          fontSize: '12px',
          margin: '4px',
          padding: '4px 6px',
          borderRadius: '4px',
          cursor: 'pointer',
        })
        .click(handler);
    }
  
    buildCheckBox(id, checked) {
      return $('<input>')
        .attr({ id: id, type: 'checkbox' })
        .css({
          backgroundColor: 'black',
          color: 'white',
          fontSize: '15px',
          margin: '2px',
        })
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
        .css({
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
        })
        .prop('checked', checked);
  
      radio.on('change', function () {
        $(`input[name="${group}"]`).css('background-color', 'black');
        if (this.checked) {
          $(this).css('background-color', 'white');
        }
      });
  
      return $('<label>').append(radio).append(label);
    }
  }