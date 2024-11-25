/**
 * Manages keyboard input detection and state
 */
class KeyUtil {
    /**
     * @param {SyncUtil} syncUtil - Instance of SyncUtil for coordination
     */
    constructor(syncUtil) {
        this._syncUtil = syncUtil;
        this._doubleKeyState = {
            init: false,
            begin: false,
            end: false
        };
    }

    hasModifierKey(event) {
        if (!event || !(event instanceof KeyboardEvent)) {
            console.error('Invalid keyboard event provided to hasModifierKey');
            return false;
        }
        return event.ctrlKey || event.shiftKey || event.altKey;
    }
    
    getModifierType(event) {
        if (!event || !(event instanceof KeyboardEvent)) {
            console.error('Invalid keyboard event provided to getModifierType');
            return null;
        }
    
        if (event.ctrlKey) return 'ctrl';
        if (event.shiftKey) return 'shift';
        if (event.altKey) return 'alt';
        return null;
    }

    /**
     * Detects double key press within few milliseconds
     * Timeline NoKey-->Init-->Begin-->End-->
     * W1: Starts Init
     * W2: Resets Init
     * W3: Double Key Recorded
     * W4: Restart From Init
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {boolean} True if double key detected
     */
    isDoubleKey(event) {
        if (!event || !(event instanceof KeyboardEvent)) {
            console.error('Invalid keyboard event provided to isDoubleKey');
            return false;
        }

        try {
            // Check if key came not too fast and not too slow
            if (this._doubleKeyState.init && 
                this._doubleKeyState.begin && 
                !this._doubleKeyState.end && 
                !event.repeat) {
                return true;
            } 
            
            // After Init Before Begin; Reset Init
            else if (this._doubleKeyState.init) {
                this._doubleKeyState.init = this._doubleKeyState.begin;
            } 
            
            // Before Init
            else {
                this._doubleKeyState.init = true;
                this._doubleKeyState.begin = this._doubleKeyState.end = false;

                // W1: Enter Begin (Too Fast Keys Filtered)
                this._syncUtil.waitOn("fastDoubleKeyInput", 50, () => {
                    this._doubleKeyState.begin = true;
                });

                // W4: Reached End Reset Process
                this._syncUtil.waitOn("doubleKeyInput", 200, () => {
                    this._doubleKeyState.end = true;
                    this._doubleKeyState.init = false;
                });
            }

            return false;
        } catch (error) {
            console.error('isDoubleKey error:', error);
            return false;
        }
    }
}
