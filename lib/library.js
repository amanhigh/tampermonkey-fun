//In memory Store
var doubleKey = {};

function message(msg, timeout = 2000) {
    //Find
    let id = "aman-flash-msg";
    let el = document.getElementById(id);

    //Build if Missing
    if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.setAttribute("style", "background-color: black; color: white;font-size: 15px; position:absolute;top:20%;left:75%");
        el.innerHTML = "";
        document.body.appendChild(el);
    }

    //Remove after timeout
    waitOn(id, timeout, () => {
        el.parentNode.removeChild(el);
    })

    el.innerHTML += '<br/>' + msg;

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

/** Interaction **/
function SmartPrompt(reasons, overrides = []) {
    let modal = document.getElementById('smart-modal');

    // Remove the existing modal if it exists
    if (modal) {
        modal.remove();
    }

    return new Promise((resolve) => {
        // Recreate the modal
        modal = createSmartModal();
        document.body.appendChild(modal);

        // Add Reasons
        reasons.forEach((reason, index) => {
            const button = createSmartButton(reason, `smart-button-${index}`, modal, resolve);
            modal.appendChild(button);
        });

        // Add Overrides
        const overrideContainer = document.createElement('div');
        overrideContainer.style.display = 'flex';
        overrideContainer.style.justifyContent = 'center';
        overrideContainer.style.flexWrap = 'wrap';
        modal.appendChild(overrideContainer);

        overrides.forEach((override, index) => {
            const radioButton = createSmartRadioButton(override, `smart-radio-${index}`, overrideContainer);
            overrideContainer.appendChild(radioButton);
        });

        // Add Text Box and Cancel
        const textBox = createSmartTextBox('smart-text', modal, resolve);
        modal.appendChild(textBox);

        const cancelButton = createSmartButton('Cancel', 'smart-cancel', modal, resolve);
        modal.appendChild(cancelButton);

        modal.style.display = 'block';

        const keydownHandler = (event) => {
            if (event.key === 'Escape') {
                resolve('');
                modal.style.display = 'none';
            }
        };
        window.addEventListener('keydown', keydownHandler);
    })
}

function createSmartModal() {
    const modal = document.createElement('div');
    modal.id = 'smart-modal';
    Object.assign(modal.style, {
        display: 'none',
        width: '200px',
        height: '200px',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#000',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
    });
    return modal;
}

/**
 * Creates a smart button with the specified text, id, modal, callback, and getOverride function.
 *
 * @param {string} text - The text to display on the button.
 * @param {string} id - The id of the button.
 * @param {HTMLElement} modal - The modal element that the button will be appended to.
 * @param {function} callback - The callback function to be executed when the button is clicked.
 * @param {function} getOverride - The function to get the selected override value.
 * @return {HTMLButtonElement} The created smart button.
 */
function createSmartButton(text, id, modal, callback) {
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = text;
    button.style.background = '#fff';
    button.style.color = '#000';
    button.onclick = () => {
        const selectedOverride = getOverride();
        callback(selectedOverride ? `${text}-${selectedOverride}` : text);
        modal.style.display = 'none';
    };
    return button;
}

function createSmartTextBox(id, modal, callback) {
    const textBox = document.createElement('input');
    textBox.id = id;
    textBox.type = 'text';
    textBox.placeholder = 'Enter Reason';
    textBox.style.background = '#fff';
    textBox.style.color = '#000';
    textBox.onkeydown = function (event) {
        if (event.key === 'Enter') {
            callback(this.value);
            modal.style.display = 'none';
        }
    };
    return textBox;
}

function createSmartRadioButton(text, id, modal) {
    const label = document.createElement('label');
    label.style.display = 'block';
    label.style.color = '#fff';
    label.style.marginRight = '10px';

    const radioButton = document.createElement('input');
    radioButton.id = id;
    radioButton.type = 'radio';
    radioButton.name = 'override';
    radioButton.value = text;

    label.appendChild(radioButton);
    label.appendChild(document.createTextNode(' ' + text));
    modal.appendChild(label);

    return label;
}

function getOverride() {
    return document.querySelector('input[name="override"]:checked')?.value;
}