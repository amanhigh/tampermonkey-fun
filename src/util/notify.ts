/**
 * Utility class for displaying notifications in the UI.
 * Uses a singleton pattern with static methods for notification management.
 */
export class Notifier {
  private static readonly _containerId = 'flashId';
  private static _container: HTMLDivElement | null = null;

  /**
   * Displays a flash message in the UI
   * @param msg - Message to display
   * @param color - Text color of the message
   * @param timeout - Duration to show message in milliseconds
   * @throws Error if message content is empty or container initialization fails
   */
  public static message(msg: string, color: string, timeout = 2000): void {
    if (!msg) {
      throw new Error('Message content is required');
    }

    if (!color) {
      throw new Error('Message color is required');
    }

    try {
      this._ensureContainer();
      const messageElement = this._createMessageElement(msg, color);
      this._showWithAnimation(messageElement, timeout);
    } catch (error) {
      throw new Error(`Failed to show notification: ${error}`);
    }
  }

  // XXX: Replace console.log with this.
  public static error(msg: string, timeout = 2000): void {
    this.message(msg, 'red', timeout);
  }

  public static warn(msg: string, timeout = 2000): void {
    this.message(msg, 'orange', timeout);
  }

  // XXX: Replace Green Messages with this
  public static success(msg: string, timeout = 2000): void {
    this.message(msg, 'green', timeout);
  }

  public static info(msg: string, timeout = 2000): void {
    this.message(msg, 'white', timeout);
  }

  /**
   * Ensures the container element exists in the DOM
   * @private
   * @throws Error if container creation fails
   */
  private static _ensureContainer(): void {
    let container = document.getElementById(this._containerId) as HTMLDivElement | null;

    if (!container) {
      container = document.createElement('div');
      container.id = this._containerId;

      const containerStyles: Partial<CSSStyleDeclaration> = {
        position: 'fixed',
        top: '40%',
        right: '20%',
        maxWidth: '300px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
      };

      Object.assign(container.style, containerStyles);
      document.body.appendChild(container);
    }

    this._container = container;
  }

  /**
   * Creates a message element with specified text and color
   * @private
   * @throws Error if container is not initialized
   */
  private static _createMessageElement(msg: string, color: string): HTMLDivElement {
    if (!this._container) {
      throw new Error('Notification container not initialized');
    }

    const messageElement = document.createElement('div');

    const messageStyles: Partial<CSSStyleDeclaration> = {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: color,
      fontSize: '14px',
      padding: '10px 15px',
      marginBottom: '10px',
      borderRadius: '4px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
      opacity: '0',
      transition: 'opacity 0.3s ease-in-out',
    };

    Object.assign(messageElement.style, messageStyles);
    messageElement.innerHTML = msg;
    this._container.appendChild(messageElement);

    return messageElement;
  }

  /**
   * Handles the animation sequence for showing and hiding the message
   * @private
   * @throws Error if animation fails
   */
  private static _showWithAnimation(element: HTMLDivElement, timeout: number): void {
    // Show animation
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);

    // Hide and cleanup
    setTimeout(() => {
      element.style.opacity = '0';

      setTimeout(() => {
        if (!this._container) {
          throw new Error('Container was unexpectedly removed');
        }

        if (element.parentNode === this._container) {
          this._container.removeChild(element);

          if (this._container.childNodes.length === 0) {
            const parent = this._container.parentNode;
            if (parent) {
              parent.removeChild(this._container);
              this._container = null;
            }
          }
        }
      }, 300);
    }, timeout);
  }
}
