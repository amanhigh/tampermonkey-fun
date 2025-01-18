/**
 * Utility class for displaying notifications in the UI.
 * Uses a singleton pattern with static methods for notification management.
 */
export class Notifier {
  private static readonly _containerId = 'flashId';
  private static readonly DEFAULT_TIMEOUT = 2000;
  private static container: HTMLDivElement | null = null;

  /**
   * Displays a flash message in the UI
   * @param msg - Message to display
   * @param color - Text color of the message
   * @param timeout - Duration to show message in milliseconds
   * @throws Error if message content is empty or container initialization fails
   */
  public static message(msg: string, color: string, timeout = 2000): void {
    // TODO: Take Color Enum if Possible
    if (!msg) {
      throw new Error('Message content is required');
    }

    if (!color) {
      throw new Error('Message color is required');
    }

    try {
      this.ensureContainer();
      const messageElement = this.createMessageElement(msg, color);
      this.showWithAnimation(messageElement, timeout);
    } catch (error) {
      throw new Error(`Failed to show notification: ${error}`);
    }
  }

  /**
   * Displays and logs an error notification
   * @param error - Error object containing message and stack trace
   * @param timeout - Optional display duration in ms
   */
  public static error(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`❌ ${msg}`, 'red', timeout);
  }

  public static warn(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`⚠️ ${msg}`, 'orange', timeout);
  }

  public static success(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`✅ ${msg}`, 'green', timeout);
  }

  public static info(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`ℹ️ ${msg}`, 'white', timeout);
  }

  public static red(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`❌ ${msg}`, 'red', timeout);
  }

  public static yellow(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`${msg}`, 'yellow', timeout);
  }

  /**
   * Ensures the container element exists in the DOM
   * @private
   * @throws Error if container creation fails
   */
  private static ensureContainer(): void {
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

    this.container = container;
  }

  /**
   * Creates a message element with specified text and color
   * @private
   * @throws Error if container is not initialized
   */
  private static createMessageElement(msg: string, color: string): HTMLDivElement {
    if (!this.container) {
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
    this.container.appendChild(messageElement);

    return messageElement;
  }

  /**
   * Handles the animation sequence for showing and hiding the message
   * @private
   * @throws Error if animation fails
   */
  private static showWithAnimation(element: HTMLDivElement, timeout: number): void {
    // Show animation
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);

    // Hide and cleanup
    setTimeout(() => {
      element.style.opacity = '0';

      setTimeout(() => {
        if (!this.container) {
          throw new Error('Container was unexpectedly removed');
        }

        if (element.parentNode === this.container) {
          this.container.removeChild(element);

          if (this.container.childNodes.length === 0) {
            const parent = this.container.parentNode;
            if (parent) {
              parent.removeChild(this.container);
              this.container = null;
            }
          }
        }
      }, 300);
    }, timeout);
  }
}
