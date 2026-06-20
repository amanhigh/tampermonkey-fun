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
  attributeObserver(target: Element, callback: () => void): MutationObserver;

  /**
   * Observes childList mutations on target and fires callback once
   * when any actionable (node added or removed) mutations occur.
   * Mutation records are not forwarded to the callback — callers that
   * need node-level detail should use a dedicated observer.
   * @param target - Target element to observe
   * @param callback - Callback for changes
   * @returns MutationObserver instance or undefined if setup fails
   */
  nodeObserver(target: Element, callback: () => void): MutationObserver;
}

/**
 * Manages DOM observation operations
 */
export class ObserveUtil implements IObserveUtil {
  /** @inheritdoc */
  public attributeObserver(target: Element, callback: () => void): MutationObserver {
    if (!target || !(target instanceof Element)) {
      throw new Error('Invalid target element provided to attributeObserver');
    }

    try {
      // Always track text changes for enhanced functionality
      let previousText = target.textContent || '';

      const observer = new MutationObserver((mutations) => {
        // Detect text changes
        mutations.forEach((mutation) => {
          if (mutation.type === 'characterData' || mutation.type === 'childList') {
            const currentText = target.textContent || '';
            if (currentText !== previousText) {
              console.log(`Text changed from "${previousText}" to "${currentText}"`);
              previousText = currentText;
            }
          }
        });

        // Call original callback for all changes (backward compatibility)
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
  public nodeObserver(target: Element, callback: () => void): MutationObserver {
    if (!target || !(target instanceof Element)) {
      throw new Error('Invalid target element provided to nodeObserver');
    }

    try {
      const observer = new MutationObserver((mutations) => {
        const hasActionable = mutations.some(
          (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
        );
        if (hasActionable) {
          callback();
        }
      });

      observer.observe(target, {
        childList: true,
      });

      return observer;
    } catch (error) {
      throw new Error(`Failed to create node observer: ${error}`);
    }
  }
}
