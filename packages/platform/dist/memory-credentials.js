export class MemoryCredentials {
    #values = new Map();
    async get(key) {
        return this.#values.get(key);
    }
    async set(key, value) {
        this.#values.set(key, value);
    }
    async remove(key) {
        this.#values.delete(key);
    }
    async keys() {
        return [...this.#values.keys()];
    }
}
