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