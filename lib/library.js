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
            top: '20%',
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

/** Data Store **/
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

/** Wait Interact Methods **/
function waitClick(selector, callback = () => {
}) {
    waitEE(selector, (e) => {
        e.click();
        callback();
    });
}

function waitJClick(selector, callback = () => {
}) {
    waitJEE(selector, (e) => {
        e.click();
        callback();
    }, 3, 20);
}

/**
 * Sends Input Post Wait. Sends Enter Post That
 * @param selector Target Selector
 * @param inputValue Input To Be Sent
 */
function waitInput(selector, inputValue) {
    waitEE(selector, (e) => {
        e.value = inputValue
        e.dispatchEvent(new Event('input', { 'bubbles': true }));

        //Press Enter Post Input
        e.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, keyCode: 13 }));
    }, 6, 5)
}

function waitEE(selector, callback, count = 3, timeout = 2000) {
    const el = document.querySelector(selector);

    if (el) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitEE(selector, callback, count - 1, timeout), timeout);
    } else {
        console.log("Wait Element Failed, exiting Recursion: " + selector);
    }
}

function waitJEE(selector, callback, count = 3, timeout = 2000) {
    const el = $(selector);

    if (el.length) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitJEE(selector, callback, count - 1, timeout), timeout);
    } else {
        console.log("Jquery Wait Element Failed, exiting Recursion: " + selector);
    }
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

/** Observers **/
function attributeObserver(target, callback) {
    // Create an observer instance
    let observer = new MutationObserver(function (mutations) {
        //console.log(mutations);
        if (mutations.length > 0) {
            callback();
        }
    });

    // Pass in the target node, as well as the observer options
    observer.observe(target, {
        subtree: true,
        attributes: true,
        characterData: true
    });
}

function nodeObserver(target, callback) {
    // Create an observer instance
    let observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            //console.log(mutation);
            if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
                callback();
            }
        });
    });

    // Pass in the target node, as well as the observer options
    observer.observe(target, {
        childList: true,
    });

    // Later, you can stop observing
    //observer.disconnect();
}

function reloadPage() {
    //-- User feedback, esp useful with time delay:
    document.title = "Reloading...";
    /*-- Important:
        May need to wait 1 to 300 seconds to allow for
        alerts to get created and ]reflect.
        1222 == 1.2 seconds
    */
    window.scrollTo(0, 0);
    setTimeout(() => {
        location.reload();
    }, 3000);
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

/**
 * Detects Double Key Press within few milliseconds
 * Timeline NoKey-->Init-->Begin-->End-->
 * W1: Starts Init
 * W2: Resets Init
 * W3: Double Key Recorded
 * W4: Restart From Init
 * @param key Key to be Detected
 * @returns {boolean}
 */
function isDoubleKey(e) {
    //message(`Is Double Check for ${e.key}`)

    //Check if key came not too fast and not too slow.
    if (doubleKey.init && doubleKey.begin && !doubleKey.end && !e.repeat) {
        //message(`Double Detected for ${e.key}`)
        return true;
    } else if (doubleKey.init) {
        //W2: After Init Before Begin; Reset Init
        doubleKey.init = doubleKey.begin;
        //message(`Double Key, Init Reset ${e.key}`)

    } else {
        //W0: Before Init
        doubleKey.init = true
        doubleKey.begin = doubleKey.end = false;
        //message(`Double Key, Init ${e.key}`)

        //W1: Enter Begin (Too Fast Keys Filterd)
        waitOn("fastDoubleKeyInput", 50, () => {
            doubleKey.begin = true;
            //message(`Double Key, Init ${doubleKey.init} Start ${e.key}`)
        })

        //W4: Reached End Reset Process
        waitOn("doubleKeyInput", 200, () => {
            doubleKey.end = true;
            //message(`Double Key, Init ${doubleKey.init} End ${e.key}`)

            //Reset Init
            doubleKey.init = false;
        })
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

/* Search */
function YoutubeSearch(query) {
    GM_openInTab("https://www.youtube.com/results?search_query=" + query, { "active": false, "insert": true });
}

function YSearch(query) {
    GM_openInTab("https://yts.mx/browse-movies/" + query, { "active": false, "insert": true });
}

function XSearch(query) {
    GM_openInTab("https://www.1337x.to/search/" + query + "/1/", { "active": false, "insert": true });
}

function XtremeSearch(query) {
    GM_openInTab("https://www.airtelxstream.in/search/" + query + "?q=" + query, { "active": false, "insert": true });
}
