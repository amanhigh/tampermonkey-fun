/**
 * Interface for UI building operations
 */
export interface IUIUtil {
  /**
   * Builds a UI area with specified positioning
   * @param id - Element ID
   * @param left - Left position, defaults to '70%'
   * @param top - Top position, defaults to '10%'
   */
  buildArea(id: string, left?: string, top?: string): JQuery;

  /**
   * Builds a wrapper container with specified width
   * @param id - Element ID
   * @param width - Container width, defaults to '300px'
   */
  buildWrapper(id: string, width?: string): JQuery;

  /**
   * Builds an input field with focus/blur effects
   * @param id - Element ID
   */
  buildInput(id: string): JQuery;

  /**
   * Builds a label with specified text and color
   * @param text - Label text
   * @param color - Text color, defaults to 'white'
   * @param id - Optional element ID
   */
  buildLabel(text: string, color?: string, id?: string): JQuery;

  /**
   * Toggles visibility of a UI element
   * @param selector - Element selector
   */
  toggleUI(selector: string): void;

  /**
   * Builds a button element with the specified id, text, and click handler
   * @param id - The id of the button
   * @param text - The text to display on the button
   * @param handler - The function to be executed when the button is clicked
   */
  buildButton(id: string, text: string, handler: () => void): JQuery;

  /**
   * Builds a checkbox with specified state
   * @param id - Element ID
   * @param checked - Initial checked state
   */
  buildCheckBox(id: string, checked: boolean): JQuery;

  /**
   * Builds a radio button with label
   * @param label - Radio button label
   * @param value - Radio button value
   * @param group - Radio button group name
   * @param checked - Initial checked state
   */
  buildRadio(label: string, value: string, group: string, checked?: boolean): JQuery;

  /**
   * Creates a colored text string using HTML span element
   * @param text - The text to be colored
   * @param color - CSS color value (name, hex, rgb, etc.)
   * @returns HTML string with colored text
   */
  colorText(text: string, color: string): string;
}

export class UIUtil implements IUIUtil {
  // UI Component Classes
  private static readonly CLASSES = {
    AREA: 'aman-area',
    BUTTON: 'aman-button',
    CHECKBOX: 'aman-checkbox',
    INPUT: 'aman-input',
    LABEL: 'aman-label',
    RADIO: 'aman-radio',
    RADIO_LABEL: 'aman-radio-label',
  };

  /** @inheritdoc */
  public buildArea(id: string, left = '70%', top = '10%'): JQuery {
    return $('<div>').attr({ id }).addClass(UIUtil.CLASSES.AREA).css({ left, top });
  }

  /** @inheritdoc */
  public buildWrapper(id: string, width = '300px'): JQuery {
    return $('<div>').attr({ id }).css({ width });
  }

  /** @inheritdoc */
  public buildInput(id: string): JQuery {
    return $('<input>').attr({ id }).addClass(UIUtil.CLASSES.INPUT);
  }

  /** @inheritdoc */
  public buildLabel(text: string, color = 'white', id?: string): JQuery {
    return $('<label>').attr({ id }).addClass(UIUtil.CLASSES.LABEL).css({ color }).html(text);
  }

  /** @inheritdoc */
  public toggleUI(selector: string): void {
    const $element = $(selector);
    if ($element.is(':visible')) {
      $element.hide();
    } else {
      $element.show();
    }
  }

  /** @inheritdoc */
  public buildButton(id: string, text: string, handler: () => void): JQuery {
    return $('<button>').attr({ id }).html(text).addClass(UIUtil.CLASSES.BUTTON).click(handler);
  }

  /** @inheritdoc */
  public buildCheckBox(id: string, checked: boolean): JQuery {
    return $('<input>').attr({ id, type: 'checkbox' }).addClass(UIUtil.CLASSES.CHECKBOX).prop('checked', checked);
  }

  /** @inheritdoc */
  public buildRadio(label: string, value: string, group: string, checked = false): JQuery {
    const radio = $('<input>')
      .attr({
        id: `aman-${group}-${value}`,
        type: 'radio',
        name: group,
        value,
      })
      .addClass(UIUtil.CLASSES.RADIO)
      .prop('checked', checked);

    return $('<label>').addClass(UIUtil.CLASSES.RADIO_LABEL).html(label).prepend(radio);
  }

  /** @inheritdoc */
  public colorText(text: string, color: string): string {
    return `<span style="color: ${color};">${text}</span>`;
  }
}
