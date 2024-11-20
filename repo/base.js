/**
 * Base repository with abstract load and save operations
 */
class BaseRepo {
    /**
     * @protected
     * @type {string}
     */
    _storeId;

    /**
     * @protected
     * @type {RepoCron}
     */
    _repoCron;

    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     * @param {string} storeId Storage identifier
     */
    constructor(repoCron, storeId) {
        this._repoCron = repoCron;
        this._storeId = storeId;
        this._repoCron.registerRepository(this);
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