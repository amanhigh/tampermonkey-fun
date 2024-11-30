/**
 * Interface for DOM observation operations
 */
export interface IObserveUtil {
  /**
   * Observes attribute changes on target
   * @param target - Target element to observe
   * @param callback - Callback for changes
   * @returns MutationObserver instance or undefined if setup fails
   */
  attributeObserver(target: Element, callback: () => void): MutationObserver | undefined;

  /**
   * Observes node changes on target
   * @param target - Target element to observe
   * @param callback - Callback for changes
   * @returns MutationObserver instance or undefined if setup fails
   */
  nodeObserver(target: Element, callback: () => void): MutationObserver | undefined;
}

/**
 * Manages DOM observation operations
 */
export class ObserveUtil implements IObserveUtil {
  /** @inheritdoc */
  public attributeObserver(target: Element, callback: () => void): MutationObserver | undefined {
    if (!target || !(target instanceof Element)) {
      throw new Error('Invalid target element provided to attributeObserver');
    }

    try {
      const observer = new MutationObserver((mutations) => {
        if (mutations.length > 0) {
          callback();
        }
      });

      observer.observe(target, {
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return observer;
    } catch (error) {
      throw new Error(`Failed to create attribute observer: ${error}`);
    }
  }

  /** @inheritdoc */
  public nodeObserver(target: Element, callback: () => void): MutationObserver | undefined {
    if (!target || !(target instanceof Element)) {
      throw new Error('Invalid target element provided to nodeObserver');
    }

    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
            callback();
          }
        });
      });

      observer.observe(target, {
        childList: true,
      });

      // Later, you can stop observing
      //observer.disconnect();

      return observer;
    } catch (error) {
      throw new Error(`Failed to create node observer: ${error}`);
    }
  }
}
