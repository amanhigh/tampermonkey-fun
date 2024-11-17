/**
 * Base repository with abstract load and save operations
 */
class BaseRepo {
    /**
     * @protected
     * @type {string}
     */
    _storeId;

    constructor(storeId) {
        this._storeId = storeId;
    }

    /**
     * Load data from storage
     * @protected
     * @returns {any} Loaded data
     */
    _load() {
        const data = GM_getValue(this._storeId, {});
        return this._deserialize(data);
    }

    /**
     * Save data to storage
     * @protected
     */
    save() {
        const data = this._serialize();
        GM_setValue(this._storeId, data);
    }

    /**
     * Serialize data for storage
     * @protected
     * @returns {any} Serialized data
     */
    _serialize() {
        throw new Error('_serialize must be implemented by derived class');
    }

    /**
     * Deserialize data from storage
     * @protected
     * @param {any} data Raw data from storage
     * @returns {any} Deserialized data
     */
    _deserialize(data) {
        throw new Error('_deserialize must be implemented by derived class');
    }
}