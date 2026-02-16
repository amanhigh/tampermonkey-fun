import { Color } from '../models/color';

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
  public static message(msg: string, color: Color, timeout = 2000): void {
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
    this.message(`❌ ${msg}`, Color.ERROR, timeout);
  }

  public static warn(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`⚠️ ${msg}`, Color.WARN, timeout);
  }

  public static success(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`✅ ${msg}`, Color.SUCCESS, timeout);
  }

  public static info(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`ℹ️ ${msg}`, Color.INFO, timeout);
  }

  public static green(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`${msg}`, Color.GREEN, timeout);
  }

  public static red(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`${msg}`, Color.RED, timeout);
  }

  public static yellow(msg: string, timeout = Notifier.DEFAULT_TIMEOUT): void {
    this.message(`${msg}`, Color.YELLOW, timeout);
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
        top: '12px',
        right: '12px',
        maxWidth: '340px',
        zIndex: '10000',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
      backgroundColor: 'rgba(22, 22, 30, 0.94)',
      color: color,
      fontSize: '12px',
      fontWeight: '500',
      letterSpacing: '0.02em',
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      opacity: '0',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      transform: 'translateX(20px)',
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
      element.style.transform = 'translateX(0)';
    }, 10);

    // Hide and cleanup
    setTimeout(() => {
      element.style.opacity = '0';
      element.style.transform = 'translateX(20px)';

      setTimeout(() => {
        if (!this.container) {
          return;
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
