class UIUtil {
    buildArea(id, left = '70%', top = '10%') {
      return $('<div>')
        .attr({ id: id })
        .css({
          position: 'absolute',
          zIndex: '9999',
          left: left,
          top: top,
        });
    }
  
    buildWrapper(id, width = '300px') {
      return $('<div>').attr({ id: id }).css('width', width);
    }
  
    buildInput(id) {
      return $('<input>')
        .attr({ id: id })
        .css({
          backgroundColor: 'black',
          color: 'white',
          fontSize: '15px',
          margin: '4px',
          padding: '6px 8px',
          border: '1px solid #444',
          borderRadius: '4px',
          outline: 'none',
          transition: 'border-color 0.3s',
        })
        .focus(function () {
          $(this).css('border-color', '#666');
        })
        .blur(function () {
          $(this).css('border-color', '#444');
        });
    }
  
    buildLabel(text, color = 'white', id) {
      return $('<label>')
        .attr({ id: id })
        .css({
          backgroundColor: 'black',
          color: color,
          fontSize: '15px',
          margin: '2px',
        })
        .html(text);
    }
  
    toggleUI(selector) {
      const $element = $(selector);
      $element.is(':visible') ? $element.hide() : $element.show();
    }
  }