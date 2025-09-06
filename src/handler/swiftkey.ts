/**
 * SwiftKey Handler - Wayland IPC Integration
 *
 * PURPOSE:
 * Manages synchronization between SwiftKey UI state and external Wayland tools
 * via document title modification. External tools monitor browser window titles
 * to enable/disable custom keyboard layouts and shortcuts.
 *
 * IPC PROTOCOL:
 * - Signal Channel: document.title property
 * - Active State: Title contains " - SwiftKeys" suffix
 * - Inactive State: Title without suffix
 * - Direction: Browser → External Wayland tools
 *
 * FLOW:
 * 1. SwiftKey checkbox state changes (user toggle, hotkey, auto-enable)
 * 2. syncTitle() called to maintain consistency
 * 3. setSwiftKeysState() updates checkbox + document title
 * 4. Title change broadcasts to Wayland window manager
 * 5. External tools detect suffix and activate SwiftKey mode
 *
 * TITLE OBSERVER INTEGRATION:
 * - Observer watches <title> element for external changes (ticker switches)
 * - When TradingView modifies title, observer calls syncTitle()
 * - Ensures " - SwiftKeys" suffix is restored after external title updates
 * - Maintains IPC signal integrity across page navigation and ticker changes
 *
 * CRITICAL DEPENDENCIES:
 * - setSwiftKeysState(enabled) call is ESSENTIAL for Wayland communication
 * - Title modifications must be immediate and atomic
 * - UI checkbox and title suffix must stay synchronized
 * - External tools depend on accurate state signaling for keyboard layout switching
 */

import { ITradingViewManager } from '../manager/tv';

export interface ISwiftKeyHandler {
  /**
   * Synchronizes document title with SwiftKey checkbox state for external IPC
   *
   * Called by title observer when TradingView changes page title to ensure
   * SwiftKey signaling suffix is preserved. The setSwiftKeysState() call
   * is critical for Wayland tool communication and cannot be removed.
   */
  syncTitle(): void;
}

export class SwiftKeyHandler implements ISwiftKeyHandler {
  constructor(private readonly tvManager: ITradingViewManager) {}

  public syncTitle(): void {
    const enabled = this.tvManager.isSwiftKeysEnabled();
    if (enabled) {
      // Critical for Wayland IPC - signals external tools to enable SwiftKey mode
      this.tvManager.setSwiftKeysState(enabled);
    }
  }
}
