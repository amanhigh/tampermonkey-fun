//In memory Store
var doubleKey = {};

function message(msg, color = 'white', timeout = 2000) {
    let container = document.getElementById(flashId);

    // Create the container if it doesn't exist
    if (!container) {
        container = document.createElement("div");
        container.id = flashId;
        document.body.appendChild(container);

        Object.assign(container.style, {
            position: 'fixed',
            top: '40%',
            right: '20%',
            maxWidth: '300px',
            zIndex: '10000',
            fontFamily: 'Arial, sans-serif',
        });
    }

    const messageElement = document.createElement("div");
    Object.assign(messageElement.style, {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: color,  // Use the provided color
        fontSize: '14px',
        padding: '10px 15px',
        marginBottom: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out',
    });

    messageElement.innerHTML = msg;
    container.appendChild(messageElement);

    // Fade in
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);

    // Remove after timeout
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            container.removeChild(messageElement);
            if (container.childNodes.length === 0) {
                container.parentNode.removeChild(container);
            }
        }, 300);
    }, timeout);
}

/** Key Checkers **/
function isModifierKey(modifier, key, e) {
    if (e.key.toLowerCase() == key && modifier) {
        e.preventDefault();
        return true;
    } else {
        return false;
    }
}

/** Utility Methods **/

/**
 * Reverses the keys and values in a given map object.
 *
 * @param {object} m - The map object to be reversed.
 * @return {object} A new map object with the keys and values reversed.
 */
function reverseMap(m) {
    var ret = {};
    for (var key in m) {
        ret[m[key]] = key;
    }
    return ret;
}