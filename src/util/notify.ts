/**
 * Utility class for displaying notifications
 */
export class Notifier {
    private static readonly _containerId = 'flashId';
    private static _container: HTMLDivElement | null = null;

    /**
     * Displays a flash message in the UI
     * @param msg - Message to display
     * @param color - Text color of the message
     * @param timeout - Duration to show message in milliseconds
     */
    public static message(msg: string, color = 'white', timeout = 2000): void {
        if (!msg) {
            console.error('Message content is required');
            return;
        }

        try {
            this._ensureContainer();
            const messageElement = this._createMessageElement(msg, color);
            if (messageElement) {
                this._showWithAnimation(messageElement, timeout);
            }
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }

    /**
     * Ensures the container element exists in the DOM
     * @private
     */
    private static _ensureContainer(): void {
        let container = document.getElementById(this._containerId) as HTMLDivElement | null;

        if (!container) {
            container = document.createElement("div");
            container.id = this._containerId;
            document.body.appendChild(container);

            const containerStyles: Partial<CSSStyleDeclaration> = {
                position: 'fixed',
                top: '40%',
                right: '20%',
                maxWidth: '300px',
                zIndex: '10000',
                fontFamily: 'Arial, sans-serif'
            };

            Object.assign(container.style, containerStyles);
        }

        this._container = container;
    }

    /**
     * Creates a message element with specified text and color
     * @private
     */
    private static _createMessageElement(msg: string, color: string): HTMLDivElement | null {
        if (!this._container) {
            // FIXME: Throw error ?
            console.error('Container not initialized');
            return null;
        }

        const messageElement = document.createElement("div");
        
        const messageStyles: Partial<CSSStyleDeclaration> = {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color:color,
            fontSize: '14px',
            padding: '10px 15px',
            marginBottom: '10px',
            borderRadius: '4px',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        };

        Object.assign(messageElement.style, messageStyles);

        messageElement.innerHTML = msg;
        this._container.appendChild(messageElement);
        
        return messageElement;
    }

    /**
     * Handles the animation sequence for showing and hiding the message
     * @private
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
                if (this._container && element.parentNode === this._container) {
                    this._container.removeChild(element);
                    
                    if (this._container.childNodes.length === 0) {
                        this._container.parentNode?.removeChild(this._container);
                        this._container = null;
                    }
                }
            }, 300);
        }, timeout);
    }
}