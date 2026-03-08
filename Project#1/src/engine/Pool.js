class Pool {
    /**
     * @param {Function} createFn - A function that returns a new instance of the object.
     * @param {number} initialSize - Initial objects to create.
     */
    constructor(createFn, initialSize = 100) {
        this.createFn = createFn;
        this.active = [];
        this.inactive = [];

        for (let i = 0; i < initialSize; i++) {
            this.inactive.push(this.createFn());
        }
    }

    /**
     * Get an object from the pool. Creates a new one if inactive is empty.
     */
    get() {
        let obj;
        if (this.inactive.length > 0) {
            obj = this.inactive.pop();
        } else {
            // Pool exhausted, expand it dynamically
            obj = this.createFn();
        }
        
        // Reset or initialize state as needed dynamically where called
        this.active.push(obj);
        return obj;
    }

    /**
     * Return an object back to the pool to be reused.
     * @param {Object} obj 
     */
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            // Remove from active array (fast swap with last element to avoid O(N) splice if unconcerned with order, 
            // but standard splice is fine for now until bottlenecked)
            this.active.splice(index, 1);
            this.inactive.push(obj);
        }
    }

    /**
     * Return all active objects back to the pool.
     */
    releaseAll() {
        while (this.active.length > 0) {
            this.inactive.push(this.active.pop());
        }
    }
}
