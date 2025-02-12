/**
 * Interface for DOM operations and observations
 */
export interface IWaitUtil {
  /**
   * Waits for element and executes callback
   * @param selector - Element selector
   * @param callback - Callback function
   * @param count - Retry count
   * @param timeout - Timeout in ms
   */
  waitEE(selector: string, callback: (element: HTMLElement) => void, count?: number, timeout?: number): void;

  /**
   * Waits for jQuery element and executes callback
   * @param selector - jQuery selector
   * @param callback - Callback function
   * @param count - Retry count
   * @param timeout - Timeout in ms
   */
  waitJEE(selector: string, callback: (element: JQuery) => void, count?: number, timeout?: number): void;

  /**
   * Waits for element and triggers click
   * @param selector - Element selector
   * @param callback - Optional callback after click
   */
  waitClick(selector: string, callback?: () => void): void;

  /**
   * Waits for jQuery element and triggers click
   * @param selector - jQuery selector
   * @param callback - Optional callback after click
   */
  waitJClick(selector: string, callback?: () => void): void;

  /**
   * Waits for element and sends input with enter key
   * @param selector - Element selector
   * @param inputValue - Value to input
   */
  waitInput(selector: string, inputValue: string): void;
}

/**
 * Manages DOM operations and observations
 */
export class WaitUtil implements IWaitUtil {
  /** @inheritdoc */
  public waitEE(selector: string, callback: (element: HTMLElement) => void, count = 3, timeout = 2000): void {
    if (!selector || typeof selector !== 'string') {
      console.error('Invalid selector provided to waitEE');
      return;
    }

    const el = document.querySelector<HTMLElement>(selector);

    if (el) {
      return callback(el);
    }

    if (count > 0) {
      setTimeout(() => this.waitEE(selector, callback, count - 1, timeout), timeout);
    } else {
      console.error('Wait Element Failed, exiting Recursion: ' + selector);
    }
  }

  /** @inheritdoc */
  public waitJEE(selector: string, callback: (element: JQuery) => void, count = 3, timeout = 2000): void {
    const el = $(selector);

    if (el.length) {
      return callback(el);
    }

    if (count > 0) {
      setTimeout(() => this.waitJEE(selector, callback, count - 1, timeout), timeout);
    } else {
      console.warn('Jquery Wait Element Failed, exiting Recursion: ' + selector);
    }
  }

  /** @inheritdoc */
  public waitClick(selector: string, callback: () => void = () => {}): void {
    this.waitEE(selector, (e) => {
      e.click();
      callback();
    });
  }

  /** @inheritdoc */
  public waitJClick(selector: string, callback: () => void = () => {}): void {
    this.waitJEE(
      selector,
      (e) => {
        e.click();
        callback();
      },
      3,
      20
    );
  }

  /** @inheritdoc */
  public waitInput(selector: string, inputValue: string): void {
    if (typeof inputValue === 'undefined') {
      console.error('Input value must be provided to waitInput');
      return;
    }

    this.waitEE(
      selector,
      (e) => {
        const inputElement = e as HTMLInputElement;
        inputElement.value = inputValue;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            keyCode: 13,
          })
        );
      },
      6,
      5
    );
  }
}
