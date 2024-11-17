/**
 * Represents a collection of categorized lists where items can only exist in one list
 */
class CategoryLists {
    /**
     * Map of categorized lists, where each list is a Set
     * @type {Map<number, Set<string>>}
     */
    _lists;

    /**
     * @param {Map<number, Set<string>>} lists Initial categorized lists
     */
    constructor(lists) {
        this._lists = lists;
    }

    /**
     * Toggle item presence in specified list
     * @param {number} listNo List number
     * @param {string} item Item to toggle
     */
    toggle(listNo, item) {
        if (this._lists.get(listNo).has(item)) {
            this.delete(listNo, item);
        } else {
            this.add(listNo, item);
        }
    }

    /**
     * Add item to specified list
     * @param {number} listNo List number
     * @param {string} item Item to add
     */
    add(listNo, item) {
        this._lists.get(listNo).add(item);
        message(`Item Added: ${item}`, colorList[listNo]);
        this._postAdd(listNo, item);
    }

    /**
     * Remove item from specified list
     * @param {number} listNo List number
     * @param {string} item Item to remove
     */
    delete(listNo, item) {
        this._lists.get(listNo).delete(item);
        message(`Item Removed: ${item}`, colorList[listNo])
    }

    /**
     * Get specified list
     * @param {number} listNo List number
     * @returns {Set<string>} The requested list
     */
    getList(listNo) {
        return this._lists.get(listNo);
    }

    /**
     * Set a new list at specified index
     * @param {number} listNo List number
     * @param {Set<string>} list New list to set
     */
    setList(listNo, list) {
        return this._lists.set(listNo, list);
    }

    /**
     * Check if item exists in specified list
     * @param {number} listNo List number
     * @param {string} item Item to check
     * @returns {boolean} True if item exists in list
     */
    contains(listNo, item) {
        return this._lists.get(listNo).has(item);
    }

    /**
     * Check if item exists in any list
     * @param {string} item Item to check
     * @returns {boolean} True if item exists in any list
     */
    containsInAny(item) {
        for (const list of this._lists.values()) {
            if (list.has(item)) return true;
        }
        return false;
    }

    /**
     * Post-add processing: Remove item from all other lists
     * @param {number} listNo Current list number
     * @param {string} item Item that was added
     * @protected
     */
    _postAdd(listNo, item) {
        this._lists.forEach((list, index) => {
            if (index !== listNo && list.has(item)) {
                this.delete(index, item);
            }
        });
    }
}