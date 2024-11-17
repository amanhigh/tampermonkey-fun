/**
 * Handles background tasks and automated operations
 */
class CronManager {
    constructor(eventManager, uiManager) {
        this.eventManager = eventManager;
        this.uiManager = uiManager;
        
        // Replay state
        this.replayCron = null;
        this.runReplay = false;
        
        // Constants
        this.SAVE_INTERVAL = 30 * 1000;    // 30 seconds
        this.REPLAY_INTERVAL = 2 * 1000;   // 2 seconds
        
        this.setupCrons();
    }

    setupCrons() {
        // Setup auto-save cron
        setInterval(() => this.cronSave(), this.SAVE_INTERVAL);
        
        // Setup event listeners for replay
        this.eventManager.registerHandler('autoSave', this.cronSave.bind(this));
        this.eventManager.registerHandler('replayToggle', this.toggleReplay.bind(this));
    }

    cronSave() {
        try {
            this._performSave();
            this._notifySaveSuccess();
        } catch (error) {
            this._handleSaveError(error);
        }
    }

    cronReplay() {
        if (!this._isReplayActive()) {
            this._stopReplayCron();
            return;
        }

        try {
            const playPauseElement = $(ReplayConstants.REPLAY_PLAY_PAUSE_SELECTOR);
            const replayRunning = this._isReplayRunning(playPauseElement);

            if (this.runReplay !== replayRunning) {
                this._toggleReplayState(playPauseElement);
            }
        } catch (error) {
            this._handleReplayError(error);
        }
    }

    toggleReplay() {
        if (!this.replayCron) {
            this._startReplayCron();
        }

        this.runReplay = !this.runReplay;
        this._notifyReplayStateChange();
    }

    // Private methods for save operations
    _performSave() {
        $(ToolbarConstants.SAVE_SELECTOR).click();
        dataSilo.save();
        pairSilo.save();
    }

    _notifySaveSuccess() {
        message("Auto Saving", ReplayConstants.COLORS.SUCCESS);
    }

    _handleSaveError(error) {
        console.error('Auto save failed:', error);
        message("Auto Save Failed", ReplayConstants.COLORS.ERROR);
    }

    // Private methods for replay operations
    _isReplayActive() {
        const isActive = $(ReplayConstants.REPLAY_ACTIVE_SELECTOR).length > 0;
        if (!isActive) {
            this._stopReplayCron();
            message("Replay Cron Stopped", ReplayConstants.COLORS.INFO);
        }
        return isActive;
    }

    _isReplayRunning(playPauseElement) {
        const pathElement = playPauseElement.find('svg > path');
        return !pathElement.attr('d').includes('m10.997');
    }

    _toggleReplayState(playPauseElement) {
        try {
            playPauseElement.click();
        } catch (error) {
            console.error('Failed to toggle replay state:', error);
            this._stopReplayCron();
        }
    }

    _startReplayCron() {
        if (this.replayCron) {
            return;
        }

        this.replayCron = setInterval(() => {
            this.cronReplay();
        }, this.REPLAY_INTERVAL);

        message("Replay Cron Started", ReplayConstants.COLORS.INFO);
    }

    _stopReplayCron() {
        if (this.replayCron) {
            clearInterval(this.replayCron);
            this.replayCron = null;
        }
    }

    _notifyReplayStateChange() {
        const state = this.runReplay ? 
            ReplayConstants.STATES.ENTERING : 
            ReplayConstants.STATES.EXITING;
        const color = this.runReplay ? 
            ReplayConstants.COLORS.SUCCESS : 
            ReplayConstants.COLORS.WARNING;
        
        message(`${state} Replay Mode`, color);
    }

    _handleReplayError(error) {
        console.error('Replay error:', error);
        message("Replay Error Occurred", ReplayConstants.COLORS.ERROR);
        this._stopReplayCron();
    }
}

/**
 * Constants for replay-related operations
 */
const ReplayConstants = {
    REPLAY_ACTIVE_SELECTOR: '.replay-active',
    REPLAY_PLAY_PAUSE_SELECTOR: '.replay-controls__play-pause',
    REPLAY_INTERVAL: 2000,
    STATES: {
        ENTERING: 'Entering',
        EXITING: 'Exiting'
    },
    COLORS: {
        SUCCESS: 'green',
        WARNING: 'yellow',
        ERROR: 'red',
        INFO: 'orange'
    }
};