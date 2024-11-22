/**
 * Utility class for displaying notifications
 */
class Notifier {
    static _containerId = 'flashId';
    static _container = null;

    /**
     * Displays a flash message in the UI
     * @param {string} msg - Message to display
     * @param {string} [color='white'] - Text color of the message
     * @param {number} [timeout=2000] - Duration to show message in milliseconds
     */
    static message(msg, color = 'white', timeout = 2000) {
        if (!msg) {
            console.error('Message content is required');
            return;
        }

        try {
            this._ensureContainer();
            const messageElement = this._createMessageElement(msg, color);
            this._showWithAnimation(messageElement, timeout);
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }

    /**
     * @private
     */
    static _ensureContainer() {
        let container = document.getElementById(this._containerId);

        if (!container) {
            container = document.createElement("div");
            container.id = this._containerId;
            document.body.appendChild(container);

            Object.assign(container.style, {
                position: 'fixed',
                top: '40%',
                right: '20%',
                maxWidth: '300px',
                zIndex: '10000',
                fontFamily: 'Arial, sans-serif'
            });
        }

        this._container = container;
    }

    /**
     * @private
     */
    static _createMessageElement(msg, color) {
        const messageElement = document.createElement("div");
        
        Object.assign(messageElement.style, {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: color,
            fontSize: '14px',
            padding: '10px 15px',
            marginBottom: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });

        messageElement.innerHTML = msg;
        this._container.appendChild(messageElement);
        
        return messageElement;
    }

    /**
     * @private
     */
    static _showWithAnimation(element, timeout) {
        setTimeout(() => element.style.opacity = '1', 10);

        setTimeout(() => {
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.parentNode === this._container) {
                    this._container.removeChild(element);
                    
                    if (this._container.childNodes.length === 0) {
                        this._container.parentNode.removeChild(this._container);
                        this._container = null;
                    }
                }
            }, 300);
        }, timeout);
    }
}