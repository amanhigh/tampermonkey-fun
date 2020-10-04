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

function waitInput(selector, inputValue) {
    waitEE(selector, (e) => {
        e.value = inputValue
        e.dispatchEvent(new Event('input', {'bubbles': true}));
    })
}

function waitEE(selector, callback, count = 3) {
    const el = document.querySelector(selector);

    if (el) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitEE(selector, callback, count - 1), 2000);
    } else {
        console.log("Wait Element Failed, exiting Recursion: " + selector);
    }
}

function waitJEE(selector, callback, count = 3) {
    const el = $(selector);

    if (el.length) {
        return callback(el);
    }

    if (count > 0) {
        setTimeout(() => waitJEE(selector, callback, count - 1), 2000);
    } else {
        console.log("Jquery Wait Element Failed, exiting Recursion: " + selector);
    }
}

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
 * @param key Key to be Detected
 * @returns {boolean}
 */
function isDoubleKey(key) {
    //message(`Is Double Check for ${key}`)

    //Check if key came not too fast and not too slow.
    if (!doubleKey.fast && doubleKey.slow) {
        // message(`Double Detected for ${key}`)

        //Reset State to record next double key
        doubleKey.fast = doubleKey.slow = false;

        return true;
    } else {
        //message("Setting Double KeyMap for " + key);
        doubleKey.fast = doubleKey.slow = true;

        //Set Fast Time to ensure keys pressed too fast are ignore. (Long press repeat)
        waitOn("fastDoubleKeyInput", 60, () => {
            doubleKey.fast = false;
            // message(`Cleared Fast Double Key ${key}`)
        })

        //Set Long Timer to remove non double key presses
        waitOn("doubleKeyInput", 100, () => {
            doubleKey.slow = false;
            //message(`Cleared Double Key ${key}`)
        })
    }
}

/** Utility Methods **/
function reverseMap(m) {
    var ret = {};
    for(var key in m){
        ret[m[key]] = key;
    }
    return ret;
}