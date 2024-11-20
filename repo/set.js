/**
 * Base repository for Set-based storage
 */
class SetRepo extends BaseRepo {
    /**
     * @protected
     * @type {Set<any>}
     */
    _set;

     /**
     * @param {RepoCron} repoCron Repository auto-save manager
     * @param {string} storeId Storage identifier
     */
     constructor(repoCron, storeId) {
        super(repoCron, storeId);
        this._set = this._load();
    }

    /**
     * @protected
     * @param {Object} data Raw storage data
     * @returns {Set<any>} Deserialized set
     */
    _deserialize(data) {
        return new Set(data);
    }

    /**
     * @protected
     * @returns {any[]} Serialized data
     */
    _serialize() {
        return [...this._set];
    }

    /**
     * Add item to set
     * @param {any} item Item to add
     */
    add(item) {
        this._set.add(item);
    }

    /**
     * Remove item from set
     * @param {any} item Item to remove
     * @returns {boolean} True if item was removed
     */
    delete(item) {
        return this._set.delete(item);
    }

    /**
     * Check if item exists in set
     * @param {any} item Item to check
     * @returns {boolean} True if item exists
     */
    has(item) {
        return this._set.has(item);
    }

    /**
     * Get all items
     * @returns {Set<any>} Set of all items
     */
    getAll() {
        return this._set;
    }

    /**
     * Get count of items
     * @returns {number} Number of items in set
     */
    getCount() {
        return this._set.size;
    }

    /**
     * Clear all items
     */
    clear() {
        this._set.clear();
    }
}