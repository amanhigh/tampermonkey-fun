import { Styles } from './styles';

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
}

export class UIUtil implements IUIUtil {
    /** @inheritdoc */
    public buildArea(id: string, left = '70%', top = '10%'): JQuery {
        return $('<div>')
            .attr({ id })
            .css({
                ...Styles.AREA.BASE,
                left,
                top,
            });
    }

    /** @inheritdoc */
    public buildWrapper(id: string, width = '300px'): JQuery {
        return $('<div>')
            .attr({ id })
            .css({
                width,
            });
    }

    /** @inheritdoc */
    public buildInput(id: string): JQuery {
        return $('<input>')
            .attr({ id })
            .css(Styles.INPUT.BASE)
            .focus(function() {
                $(this).css(Styles.INPUT.FOCUS || {});
            })
            .blur(function() {
                $(this).css(Styles.INPUT.BLUR || {});
            });
    }

    /** @inheritdoc */
    public buildLabel(text: string, color = 'white', id?: string): JQuery {
        return $('<label>')
            .attr({ id })
            .css({
                ...Styles.LABEL.BASE,
                color,
            })
            .html(text);
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
        return $('<button>')
            .attr({ id })
            .html(text)
            .css(Styles.BUTTON.BASE)
            .hover(
                function() {
                    $(this).css(Styles.BUTTON.HOVER || {});
                },
                function() {
                    $(this).css(Styles.BUTTON.BASE);
                }
            )
            .mousedown(function() {
                $(this).css(Styles.BUTTON.ACTIVE || {});
            })
            .mouseup(function() {
                $(this).css(Styles.BUTTON.HOVER || {});
            })
            .click(handler);
    }

    /** @inheritdoc */
    public buildCheckBox(id: string, checked: boolean): JQuery {
        return $('<input>')
            .attr({ id, type: 'checkbox' })
            .css(Styles.CHECKBOX.BASE)
            .prop('checked', checked);
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
            .css(Styles.RADIO.BASE)
            .prop('checked', checked);

        radio.on('change', function() {
            $(`input[name="${group}"]`).css('background-color', 'black');
            const $this = $(this);
            if ($this.prop('checked')) {
                $this.css('background-color', 'white');
            }
        });

        return this.buildLabel(label).prepend(radio);
    }
}
