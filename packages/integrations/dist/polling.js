export class IssuePoller {
    #known = new Set();
    #fetch;
    #onNew;
    #isEnabled;
    constructor(options) {
        this.#fetch = options.fetch;
        this.#onNew = options.onNew;
        this.#isEnabled = options.isEnabled ?? (() => true);
    }
    /** Polls once; returns the genuinely new issues and emits them. */
    async poll() {
        if (!this.#isEnabled())
            return [];
        const issues = await this.#fetch();
        const fresh = issues.filter((issue) => !this.#known.has(issue.id));
        for (const issue of issues)
            this.#known.add(issue.id);
        if (fresh.length)
            this.#onNew(fresh);
        return fresh;
    }
    /** Seed the known set (e.g. from the first backlog import) without emitting. */
    seed(ids) {
        for (const id of ids)
            this.#known.add(id);
    }
    knownCount() {
        return this.#known.size;
    }
    forget(id) {
        this.#known.delete(id);
    }
}
