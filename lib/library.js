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

/**
 * Wait on a resource with a timeout, and execute a callback when the resource becomes available.
 *
 * @param {string} id - The unique identifier of the resource to wait on.
 * @param {number} timeout - The timeout period in milliseconds.
 * @param {function} callback - The callback function to execute when the resource becomes available.
 */
function waitOn(id, timeout, callback) {
    let mutexId = "wait-" + id;
    let dataId = 'aman-data-' + id;

    //Find
    var $waitOn = $('#aman-wait-on');
    //Add Mutex Element If not there. (First Time)
    if (!$waitOn.length) {
        $waitOn = $('<div>').attr('id', 'aman-wait-on').appendTo('body');
    }

    if (!$waitOn.hasClass(mutexId)) {
        //Set Mutex Class
        // console.log('Taking Mutex Lock', id);
        $waitOn.toggleClass(mutexId);
        $waitOn.data(dataId, timeout); //Start filling timeout Bucket.

        let waitPeriod = timeout / 2;

        function monitorMutex() {
            let newTimeout = $waitOn.data(dataId) - waitPeriod; //Remove elapsed Time from timeout Bucket.
            $waitOn.data(dataId, newTimeout);
            // console.log('Mutex Depleted: ', id, newTimeout)
            /* Handles last element grace period to execute */
            if (newTimeout <= -timeout) {
                // console.log('Mutex Expired: ', id);
                $waitOn.toggleClass(mutexId);
                callback();
            } else {
                setTimeout(monitorMutex, waitPeriod);
            }
        }

        setTimeout(monitorMutex, waitPeriod);
    } else {
        let newTimeout = $waitOn.data(dataId) + timeout; //Add to Timeout Bucket
        $waitOn.data(dataId, newTimeout);
        // console.log('Mutex Filled: ', id, newTimeout);
    }
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