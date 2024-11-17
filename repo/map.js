/**
 * Base repository for Map-based storage
 */
class MapRepo extends BaseRepo {
    /**
     * @protected
     * @type {Map<any, any>}
     */
    _map;

    /**
     * @param {string} storeId Storage identifier
     */
    constructor(storeId) {
        super(storeId);
        this._map = this._load();
    }

    /**
     * Deserialize storage data into Map
     * @protected
     * @param {Object} data Raw storage data
     * @returns {Map<any, any>} Deserialized map
     */
    _deserialize(data) {
        return new Map(Object.entries(data));
    }

    /**
     * Serialize Map for storage
     * @protected
     * @returns {Object} Serialized data
     */
    _serialize() {
        const storeData = {};
        this._map.forEach((value, key) => {
            storeData[key] = value;
        });
        return storeData;
    }

    /**
     * Clear all entries
     */
    clear() {
        this._map.clear();
    }

    /**
     * Get count of entries
     * @returns {number} Number of entries in map
     */
    getCount() {
        return this._map.size;
    }

    /**
     * Get all keys
     * @returns {any[]} Array of keys
     */
    getAllKeys() {
        return Array.from(this._map.keys());
    }

    /**
     * Check if key exists
     * @param {any} key Key to check
     * @returns {boolean} True if key exists
     */
    has(key) {
        return this._map.has(key);
    }

    /**
     * Get value for key
     * @param {any} key Key to lookup
     * @returns {any|undefined} Value if exists
     */
    get(key) {
        return this._map.get(key);
    }

    /**
     * Set value for key
     * @param {any} key Key to set
     * @param {any} value Value to set
     */
    set(key, value) {
        this._map.set(key, value);
    }

    /**
     * Delete entry by key
     * @param {any} key Key to delete
     * @returns {boolean} True if entry was deleted
     */
    delete(key) {
        return this._map.delete(key);
    }
}