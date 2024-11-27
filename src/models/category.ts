/**
 * Represents a collection of categorized lists where items can only exist in one list
 */
export class CategoryLists {
    /**
     * Map of categorized lists, where each list is a Set
     * @type {Map<number, Set<string>>}
     */
    _lists: Map<number, Set<string>>;

    /**
     * @param {Map<number, Set<string>>} lists Initial categorized lists
     */
    constructor(lists: Map<number, Set<string>>) {
        this._lists = lists;
    }

    /**
     * Toggle item presence in specified list
     * @param {number} listNo List number
     * @param {string} item Item to toggle
     */
    toggle(listNo: number, item: string): void {
        if (this._lists.get(listNo)?.has(item)) {
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
    add(listNo: number, item: string): void {
        this._lists.get(listNo)?.add(item);
        this._postAdd(listNo, item);
    }

    /**
     * Remove item from specified list
     * @param {number} listNo List number
     * @param {string} item Item to remove
     */
    delete(listNo: number, item: string): void {
        this._lists.get(listNo)?.delete(item);
    }

    /**
     * Get specified list
     * @param {number} listNo List number
     * @returns {Set<string>} The requested list
     */
    getList(listNo: number): Set<string> | undefined {
        return this._lists.get(listNo);
    }

    /**
     * Set a new list at specified index
     * @param {number} listNo List number
     * @param {Set<string>} list New list to set
     */
    setList(listNo: number, list: Set<string>): Map<number, Set<string>> {
        return this._lists.set(listNo, list);
    }

    /**
     * Check if item exists in specified list
     * @param {number} listNo List number
     * @param {string} item Item to check
     * @returns {boolean} True if item exists in list
     */
    contains(listNo: number, item: string): boolean {
        return this._lists.get(listNo)?.has(item) ?? false;
    }

    /**
     * Check if item exists in any list
     * @param {string} item Item to check
     * @returns {boolean} True if item exists in any list
     */
    containsInAny(item: string): boolean {
        for (const list of this._lists.values()) {
            if (list.has(item)) {return true;}
        }
        return false;
    }

    /**
     * Post-add processing: Remove item from all other lists
     * @param {number} listNo Current list number
     * @param {string} item Item that was added
     * @protected
     */
    _postAdd(listNo: number, item: string): void {
        this._lists.forEach((list, index) => {
            if (index !== listNo && list.has(item)) {
                this.delete(index, item);
            }
        });
    }
}
