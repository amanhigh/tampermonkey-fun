import { Styles } from './styles';

export class UIUtil {
    /**
     * Builds a UI area with specified positioning
     */
    public buildArea(id: string, left = '70%', top = '10%'): JQuery {
        return $('<div>')
            .attr({ id })
            .css({
                ...Styles.AREA.BASE,
                left,
                top,
            });
    }

    /**
     * Builds a wrapper container with specified width
     */
    public buildWrapper(id: string, width = '300px'): JQuery {
        return $('<div>')
            .attr({ id })
            .css({
                width,
            });
    }

    /**
     * Builds an input field with focus/blur effects
     */
    public buildInput(id: string): JQuery {
        return $('<input>')
            .attr({ id })
            .css(Styles.INPUT.BASE)
            .focus(function(this: HTMLElement) {
                $(this).css(Styles.INPUT.FOCUS || {});
            })
            .blur(function(this: HTMLElement) {
                $(this).css(Styles.INPUT.BLUR || {});
            });
    }

    /**
     * Builds a label with specified text and color
     */
    public buildLabel(text: string, color = 'white', id?: string): JQuery {
        return $('<label>')
            .attr({ id })
            .css({
                ...Styles.LABEL.BASE,
                color,
            })
            .html(text);
    }

    /**
     * Toggles visibility of a UI element
     */
    public toggleUI(selector: string): void {
        const $element = $(selector);
        $element.is(':visible') ? $element.hide() : $element.show();
    }

    /**
     * Builds a button element with the specified id, text, and click handler
     * @param id - The id of the button
     * @param text - The text to display on the button
     * @param handler - The function to be executed when the button is clicked
     * @returns The constructed button element
     */
    public buildButton(id: string, text: string, handler: () => void): JQuery {
        return $('<button>')
            .attr({ id })
            .html(text)
            .css(Styles.BUTTON.BASE)
            .hover(
                function(this: HTMLElement) {
                    $(this).css(Styles.BUTTON.HOVER || {});
                },
                function(this: HTMLElement) {
                    $(this).css(Styles.BUTTON.BASE);
                }
            )
            .mousedown(function(this: HTMLElement) {
                $(this).css(Styles.BUTTON.ACTIVE || {});
            })
            .mouseup(function(this: HTMLElement) {
                $(this).css(Styles.BUTTON.HOVER || {});
            })
            .click(handler);
    }

    /**
     * Builds a checkbox with specified state
     */
    public buildCheckBox(id: string, checked: boolean): JQuery {
        return $('<input>')
            // BUG: Should we pass id:id ?
            .attr({ id, type: 'checkbox' })
            .css(Styles.CHECKBOX.BASE)
            .prop('checked', checked);
    }

    /**
     * Builds a radio button with label
     */
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

        radio.on('change', function(this: HTMLElement) {
            $(`input[name="${group}"]`).css('background-color', 'black');
            if (this.checked) {
                $(this).css('background-color', 'white');
            }
        });

        return this.buildLabel(label).prepend(radio);
    }
}
